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

    // Build Discord embed with each answer on its own line
    const description = [
      `**Applicant Character:** ${session.character_name}`,
      `**Character ID:** ${session.character_id}`,
      `**Main Character (Self-Reported):** ${main_character}`,
      `**Discord Name:** ${body.discord_name || 'Same as main'}`,
      ``,
      `**BLOPS Experience:** ${blops_experience}`,
      `**Hunter Experience:** ${hunter_experience}`,
      `**Bridge Experience:** ${bridge_experience}`,
      `**Roller Experience:** ${roller_experience}`,
      `**Familiar with Fleet Types:** ${familiar_fleet_types}`,
      `**Time with BB:** ${bb_duration}`,
      `**Preferred Timezones:** ${timezones}`,
      ``,
      `**Prior FC Experience:**`,
      prior_fc_experience.substring(0, 1024),
      ``,
      `**Desired Fleet Types:**`,
      fleet_types.substring(0, 1024),
      ``,
      `**Motivation:**`,
      motivation.substring(0, 1024)
    ].join('\n');

    const embed = {
      title: 'New FC Application',
      description: description.substring(0, 4096), // Discord limit
      color: 0x22c55e, // Green color for applications
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
