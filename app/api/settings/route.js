import { NextResponse } from 'next/server';
const db = require('../../../src/database/connection');
const { initSchema } = require('../../../src/database/schema');
const { DEFAULT_SETTINGS } = require('../../../src/config/constants');

export async function GET() {
  try {
    await initSchema();
    const rows = await db.all('SELECT * FROM settings');
    const s = Object.fromEntries(rows.map((row) => [row.k, row.v]));
    return NextResponse.json({
      shop_name: s.shop_name || DEFAULT_SETTINGS.shop_name,
      whatsapp: s.whatsapp || DEFAULT_SETTINGS.whatsapp,
      free_ship: +(s.free_ship || DEFAULT_SETTINGS.free_ship),
      ship_dhaka: +(s.ship_dhaka || DEFAULT_SETTINGS.ship_dhaka),
      ship_outside: +(s.ship_outside || DEFAULT_SETTINGS.ship_outside),
      video_ad_active: s.video_ad_active ?? '1',
      video_ad_url: s.video_ad_url || '/videos/promo.mp4',
      video_ad_poster: s.video_ad_poster || '/images/video-poster.jpg',
      video_ad_tag: s.video_ad_tag || '✦ 3D CRAFTSMANSHIP CINEMATIC',
      video_ad_title: s.video_ad_title || 'Precision in Motion. Sound in Perfection.',
      video_ad_subtitle: s.video_ad_subtitle || 'Experience our 2026 flagship curation — forged from surgical-grade gold alloy, scratchproof sapphire crystal, and acoustic titanium.',
      video_ad_cta_text: s.video_ad_cta_text || 'Shop The Collection',
      video_ad_cta_link: s.video_ad_cta_link || '#shop',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
