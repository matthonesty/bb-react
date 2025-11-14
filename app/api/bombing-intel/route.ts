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

    // Build Discord embed
    const embed = {
      title: 'New Bombing Intel',
      color: 0xef4444, // Red color for intel
      fields: [
        {
          name: 'Submitted By',
          value: session.character_name,
          inline: true
        },
        {
          name: 'Character ID',
          value: session.character_id.toString(),
          inline: true
        },
        {
          name: 'Target Location',
          value: target_location,
          inline: true
        },
        {
          name: 'Timer Date',
          value: timer_date,
          inline: true
        },
        {
          name: 'Timer Time (EVE)',
          value: timer_time,
          inline: true
        },
        {
          name: 'Affiliation',
          value: body.affiliation || 'Not specified',
          inline: true
        },
        {
          name: 'Target Description',
          value: target_description.substring(0, 1024),
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Submitted via ${session.character_name}`
      }
    };

    // Add expected doctrines if provided
    if (body.expected_doctrines && body.expected_doctrines.trim()) {
      embed.fields.push({
        name: 'Expected Doctrines',
        value: body.expected_doctrines.substring(0, 1024),
        inline: false
      });
    }

    // Add battle report if provided
    if (body.battle_report && body.battle_report.trim()) {
      embed.fields.push({
        name: 'Battle Report Link',
        value: body.battle_report,
        inline: false
      });
    }

    // Add contact info if provided (confidential)
    if (body.contact_info && body.contact_info.trim()) {
      embed.fields.push({
        name: 'Contact Info (Confidential)',
        value: body.contact_info.substring(0, 1024),
        inline: false
      });
    }

    // Add additional info if provided
    if (body.additional_info && body.additional_info.trim()) {
      embed.fields.push({
        name: 'Additional Information',
        value: body.additional_info.substring(0, 1024),
        inline: false
      });
    }

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
