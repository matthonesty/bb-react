/**
 * @fileoverview FC Feedback Form API endpoint
 * Accepts anonymous feedback from authenticated users and posts to Discord
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

/**
 * POST /api/fc-feedback - Submit FC feedback
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication (but keep feedback anonymous)
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
      fc_name,
      fleet_date,
      fleet_time,
      fleet_type,
      fc_rating,
      had_fun
    } = body;

    if (!fc_name || !fleet_date || !fleet_time || !fleet_type || !fc_rating || !had_fun) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Build Discord embed
    const embed = {
      title: 'New FC Feedback',
      color: 0x3b82f6, // Blue color
      fields: [
        {
          name: 'Fleet Commander',
          value: fc_name,
          inline: true
        },
        {
          name: 'Date',
          value: fleet_date,
          inline: true
        },
        {
          name: 'Time',
          value: fleet_time,
          inline: true
        },
        {
          name: 'Fleet Type',
          value: fleet_type,
          inline: true
        },
        {
          name: 'Fleet Length',
          value: body.fleet_length || 'Not specified',
          inline: true
        },
        {
          name: 'Clear Communication',
          value: body.was_clear || 'Not specified',
          inline: true
        },
        {
          name: 'FC Rating',
          value: `${fc_rating}/3`,
          inline: true
        },
        {
          name: 'Had Fun?',
          value: had_fun,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    // Add roles
    if (body.roles) {
      embed.fields.push({
        name: 'Roles Filled',
        value: body.roles || 'None',
        inline: true
      });
    }

    // Add experience
    if (body.experience) {
      embed.fields.push({
        name: 'Experience Level',
        value: body.experience,
        inline: true
      });
    }

    // Add optional clarity improvement
    if (body.clarity_improvement && body.clarity_improvement.trim()) {
      embed.fields.push({
        name: 'Communication Improvement Suggestions',
        value: body.clarity_improvement.substring(0, 1024),
        inline: false
      });
    }

    // Add optional FC improvement
    if (body.fc_improvement && body.fc_improvement.trim()) {
      embed.fields.push({
        name: 'FC Improvement Suggestions',
        value: body.fc_improvement.substring(0, 1024),
        inline: false
      });
    }

    // Add optional defining moment
    if (body.defining_moment && body.defining_moment.trim()) {
      embed.fields.push({
        name: 'Defining Moment',
        value: body.defining_moment.substring(0, 1024),
        inline: false
      });
    }

    // Add optional additional comments
    if (body.additional_comments && body.additional_comments.trim()) {
      embed.fields.push({
        name: 'Additional Comments',
        value: body.additional_comments.substring(0, 1024),
        inline: false
      });
    }

    // Post to Discord webhook
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('[FC-FEEDBACK] DISCORD_WEBHOOK_URL not configured');
      return NextResponse.json({
        success: false,
        error: 'Feedback system not configured'
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
      console.error('[FC-FEEDBACK] Discord webhook error:', discordResponse.status, errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to submit feedback'
      }, { status: 500 });
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully'
    });

  } catch (error: any) {
    console.error('[FC-FEEDBACK] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process feedback'
    }, { status: 500 });
  }
}
