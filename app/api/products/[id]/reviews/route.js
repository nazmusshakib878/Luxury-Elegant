import { NextResponse } from 'next/server';
const db = require('../../../../../src/database/connection');
const { initSchema } = require('../../../../../src/database/schema');

export async function GET(request, { params }) {
  try {
    await initSchema();
    const { id } = await params;
    const reviews = await db.all(
      'SELECT id, product_id, user_name, rating, comment, created FROM reviews WHERE product_id = ? ORDER BY id DESC',
      [id]
    );
    return NextResponse.json(reviews);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    await initSchema();
    const { id } = await params;
    const body = await request.json();
    const { user_name, rating, comment } = body;

    if (!user_name || !user_name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: 'Review comment is required' }, { status: 400 });
    }

    const cleanRating = Math.max(1, Math.min(5, Math.round(+rating || 5)));

    await db.run(
      'INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)',
      [+id, user_name.trim(), cleanRating, comment.trim()]
    );

    return NextResponse.json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
