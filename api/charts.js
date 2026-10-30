// Per-user chart storage in DynamoDB (partition key: Google account id, sort key: chart id).
// GET    /api/charts            -> { charts, initialized }
// PUT    /api/charts  { chart } -> upsert one chart
// POST   /api/charts  { charts } -> bulk import (first sign-in: demo + local charts), marks user initialized
// DELETE /api/charts?id=<id>    -> delete one chart
import { QueryCommand, PutCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLE, PROFILE_ID, getSessionUser, readJsonBody } from './_lib.js';

const FIELDS = ['title', 'key', 'tempo', 'time', 'songwriter', 'chartedBy', 'chart', 'savedAt'];
const MAX_CHART_BYTES = 200 * 1024;

function cleanChart(input) {
    if (!input || typeof input !== 'object') throw new Error('Invalid chart');
    const id = String(input.id || '');
    if (!id || id.length > 64 || id.startsWith('#')) throw new Error('Invalid chart id');
    const chart = { id };
    for (const f of FIELDS) {
        if (input[f] !== undefined && input[f] !== null) chart[f] = String(input[f]);
    }
    if (!chart.savedAt) chart.savedAt = new Date().toISOString();
    if (JSON.stringify(chart).length > MAX_CHART_BYTES) throw new Error('Chart too large');
    return chart;
}

function toItem(userId, chart) {
    const { id, ...rest } = chart;
    return { userId, chartId: id, ...rest };
}

function fromItem(item) {
    const { userId, chartId, ...rest } = item;
    return { id: chartId, ...rest };
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });

    try {
        if (req.method === 'GET') {
            const items = [];
            let ExclusiveStartKey;
            do {
                const out = await db.send(new QueryCommand({
                    TableName: TABLE,
                    KeyConditionExpression: 'userId = :u',
                    ExpressionAttributeValues: { ':u': user.sub },
                    ExclusiveStartKey
                }));
                items.push(...out.Items);
                ExclusiveStartKey = out.LastEvaluatedKey;
            } while (ExclusiveStartKey);

            const initialized = items.some(i => i.chartId === PROFILE_ID);
            const charts = items.filter(i => i.chartId !== PROFILE_ID).map(fromItem);
            return res.status(200).json({ charts, initialized });
        }

        if (req.method === 'PUT') {
            let chart;
            try {
                chart = cleanChart((await readJsonBody(req)).chart);
            } catch (e) {
                return res.status(400).json({ error: e.message });
            }
            await db.send(new PutCommand({ TableName: TABLE, Item: toItem(user.sub, chart) }));
            return res.status(200).json({ chart });
        }

        if (req.method === 'POST') {
            let charts;
            try {
                const body = await readJsonBody(req);
                charts = (Array.isArray(body.charts) ? body.charts : []).slice(0, 500).map(cleanChart);
            } catch (e) {
                return res.status(400).json({ error: e.message });
            }
            const items = charts.map(c => toItem(user.sub, c));
            items.push({ userId: user.sub, chartId: PROFILE_ID, email: user.email, createdAt: new Date().toISOString() });
            for (let i = 0; i < items.length; i += 25) {
                let pending = { [TABLE]: items.slice(i, i + 25).map(Item => ({ PutRequest: { Item } })) };
                for (let attempt = 0; pending && Object.keys(pending).length && attempt < 5; attempt++) {
                    const out = await db.send(new BatchWriteCommand({ RequestItems: pending }));
                    pending = out.UnprocessedItems;
                    if (pending && Object.keys(pending).length) await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
                }
                if (pending && Object.keys(pending).length) throw new Error('Batch write incomplete');
            }
            return res.status(200).json({ imported: charts.length });
        }

        if (req.method === 'DELETE') {
            const id = String(req.query.id || '');
            if (!id || id.startsWith('#')) return res.status(400).json({ error: 'Invalid chart id' });
            await db.send(new DeleteCommand({ TableName: TABLE, Key: { userId: user.sub, chartId: id } }));
            return res.status(200).json({ ok: true });
        }

        res.setHeader('Allow', 'GET, PUT, POST, DELETE');
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('charts error', e);
        return res.status(500).json({ error: 'Server error' });
    }
}
