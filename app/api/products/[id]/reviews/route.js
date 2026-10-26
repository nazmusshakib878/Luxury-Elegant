import { NextResponse } from 'next/server';
const { getRequestUser } = require('../../../../../src/utils/route-auth');
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
    const user = getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Login required to submit a review' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const { rating, comment } = body;

    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: 'Review comment is required' }, { status: 400 });
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
    }
    const cleanRating = Math.round(numericRating);

    await db.run(
      'INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)',
      [+id, String(user.name || 'Customer').trim().slice(0, 100), cleanRating, comment.trim().slice(0, 2000)]
    );

    return NextResponse.json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
