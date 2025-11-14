/**
 * @fileoverview FC Application API endpoint
 * Accepts applications from authenticated users and posts to Discord
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

/**
 * POST /api/fc-application - Submit FC application
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
      main_character,
      prior_fc_experience,
      blops_experience,
      hunter_experience,
      bridge_experience,
      roller_experience,
      familiar_fleet_types,
      fleet_types,
      timezones,
      bb_duration,
      motivation
    } = body;

    if (!main_character || !prior_fc_experience || !blops_experience ||
        !hunter_experience || !bridge_experience || !roller_experience ||
        !familiar_fleet_types || !fleet_types || !timezones ||
        !bb_duration || !motivation) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Build Discord embed
    const embed = {
      title: 'New FC Application',
      color: 0x22c55e, // Green color for applications
      fields: [
        {
          name: 'Applicant Character',
          value: session.character_name,
          inline: true
        },
        {
          name: 'Character ID',
          value: session.character_id.toString(),
          inline: true
        },
        {
          name: 'Main Character (Self-Reported)',
          value: main_character,
          inline: true
        },
        {
          name: 'Discord Name',
          value: body.discord_name || 'Same as main',
          inline: true
        },
        {
          name: 'BLOPS Experience',
          value: blops_experience,
          inline: true
        },
        {
          name: 'Hunter Experience',
          value: hunter_experience,
          inline: true
        },
        {
          name: 'Bridge Experience',
          value: bridge_experience,
          inline: true
        },
        {
          name: 'Roller Experience',
          value: roller_experience,
          inline: true
        },
        {
          name: 'Familiar with Fleet Types',
          value: familiar_fleet_types,
          inline: true
        },
        {
          name: 'Time with BB',
          value: bb_duration,
          inline: true
        },
        {
          name: 'Preferred Timezones',
          value: timezones,
          inline: false
        },
        {
          name: 'Prior FC Experience',
          value: prior_fc_experience.substring(0, 1024),
          inline: false
        },
        {
          name: 'Desired Fleet Types',
          value: fleet_types.substring(0, 1024),
          inline: false
        },
        {
          name: 'Motivation',
          value: motivation.substring(0, 1024),
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Applied via ${session.character_name}`
      }
    };

    // Post to Discord webhook
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('[FC-APPLICATION] DISCORD_WEBHOOK_URL not configured');
      return NextResponse.json({
        success: false,
        error: 'Application system not configured'
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
      console.error('[FC-APPLICATION] Discord webhook error:', discordResponse.status, errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to submit application'
      }, { status: 500 });
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully'
    });

  } catch (error: any) {
    console.error('[FC-APPLICATION] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process application'
    }, { status: 500 });
  }
}
