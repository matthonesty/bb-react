/**
 * @fileoverview FC Feedback Form API endpoint
 * Accepts anonymous feedback from authenticated users and posts to Discord
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublicSession } from '@/lib/auth/session';

/**
 * POST /api/fc-feedback - Submit FC feedback
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication (but keep feedback anonymous)
    const session = await getPublicSession();

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

    // Build Discord embed with each answer on its own line
    const descriptionLines = [
      `**Fleet Commander:** ${fc_name}`,
      `**Date:** ${fleet_date}`,
      `**Time:** ${fleet_time}`,
      `**Fleet Type:** ${fleet_type}`,
      `**Fleet Length:** ${body.fleet_length || 'Not specified'}`,
      `**Clear Communication:** ${body.was_clear || 'Not specified'}`,
      `**FC Rating:** ${fc_rating}/3`,
      `**Had Fun?:** ${had_fun}`
    ];

    // Add roles if provided
    if (body.roles) {
      descriptionLines.push(`**Roles Filled:** ${body.roles}`);
    }

    // Add experience if provided
    if (body.experience) {
      descriptionLines.push(`**Experience Level:** ${body.experience}`);
    }

    // Add optional clarity improvement
    if (body.clarity_improvement && body.clarity_improvement.trim()) {
      descriptionLines.push('');
      descriptionLines.push('**Communication Improvement Suggestions:**');
      descriptionLines.push(body.clarity_improvement.substring(0, 1024));
    }

    // Add optional FC improvement
    if (body.fc_improvement && body.fc_improvement.trim()) {
      descriptionLines.push('');
      descriptionLines.push('**FC Improvement Suggestions:**');
      descriptionLines.push(body.fc_improvement.substring(0, 1024));
    }

    // Add optional defining moment
    if (body.defining_moment && body.defining_moment.trim()) {
      descriptionLines.push('');
      descriptionLines.push('**Defining Moment:**');
      descriptionLines.push(body.defining_moment.substring(0, 1024));
    }

    // Add optional additional comments
    if (body.additional_comments && body.additional_comments.trim()) {
      descriptionLines.push('');
      descriptionLines.push('**Additional Comments:**');
      descriptionLines.push(body.additional_comments.substring(0, 1024));
    }

    const embed = {
      title: 'New FC Feedback',
      description: descriptionLines.join('\n').substring(0, 4096), // Discord limit
      color: 0x3b82f6, // Blue color
      timestamp: new Date().toISOString()
    };

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
