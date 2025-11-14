/**
 * @fileoverview BB Bombing Intel Form API endpoint
 * Accepts bombing intel from authenticated users and posts to Discord
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

/**
 * POST /api/bombing-intel - Submit bombing intel
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const {
      target_location,
      timer_date,
      timer_time,
      target_description
    } = body;

    if (!target_location || !timer_date || !timer_time || !target_description) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Build Discord embed with each answer on its own line
    const descriptionLines = [
      `**Submitted By:** ${session.character_name}`,
      `**Character ID:** ${session.character_id}`,
      `**Target Location:** ${target_location}`,
      `**Timer Date:** ${timer_date}`,
      `**Timer Time (EVE):** ${timer_time}`,
      `**Affiliation:** ${body.affiliation || 'Not specified'}`,
      ``,
      `**Target Description:**`,
      target_description.substring(0, 1024)
    ];

    // Add expected doctrines if provided
    if (body.expected_doctrines && body.expected_doctrines.trim()) {
      descriptionLines.push('');
      descriptionLines.push('**Expected Doctrines:**');
      descriptionLines.push(body.expected_doctrines.substring(0, 1024));
    }

    // Add battle report if provided
    if (body.battle_report && body.battle_report.trim()) {
      descriptionLines.push('');
      descriptionLines.push('**Battle Report Link:**');
      descriptionLines.push(body.battle_report);
    }

    // Add contact info if provided (confidential)
    if (body.contact_info && body.contact_info.trim()) {
      descriptionLines.push('');
      descriptionLines.push('**Contact Info (Confidential):**');
      descriptionLines.push(body.contact_info.substring(0, 1024));
    }

    // Add additional info if provided
    if (body.additional_info && body.additional_info.trim()) {
      descriptionLines.push('');
      descriptionLines.push('**Additional Information:**');
      descriptionLines.push(body.additional_info.substring(0, 1024));
    }

    const embed = {
      title: 'New Bombing Intel',
      description: descriptionLines.join('\n').substring(0, 4096), // Discord limit
      color: 0xef4444, // Red color for intel
      timestamp: new Date().toISOString(),
      footer: {
        text: `Submitted via ${session.character_name}`
      }
    };

    // Post to Discord webhook
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('[BOMBING-INTEL] DISCORD_WEBHOOK_URL not configured');
      return NextResponse.json({
        success: false,
        error: 'Intel system not configured'
      }, { status: 500 });
    }

    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error('[BOMBING-INTEL] Discord webhook error:', discordResponse.status, errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to submit intel'
      }, { status: 500 });
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Intel submitted successfully'
    });

  } catch (error: any) {
    console.error('[BOMBING-INTEL] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process intel'
    }, { status: 500 });
  }
}
