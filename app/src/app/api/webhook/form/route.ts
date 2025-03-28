import { NextResponse } from 'next/server'
import { findPlayerAndChallenge, findChallenge, completeChallenge } from '@/lib/sanity.queries'

export async function POST(request: Request) {
  try {
    const { challengeId, userEmail } = await request.json()

    if (!challengeId || !userEmail) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify if the challenge exists
    const challenge = await findChallenge(challengeId)

    if (!challenge) {
      return NextResponse.json(
        { message: 'Challenge not found' },
        { status: 404 }
      )
    }

    // Find the user and check if they haven't completed this challenge yet
    const player = await findPlayerAndChallenge(userEmail, challengeId)

    if (!player) {
      return NextResponse.json(
        { message: 'Player not found or challenge already completed' },
        { status: 404 }
      )
    }

    await completeChallenge(player._id, challengeId)

    return NextResponse.json({ 
      message: 'Challenge completed successfully',
      success: true
    })

  } catch (error) {
    console.error('Form Webhook Error:', error)
    return NextResponse.json(
      { message: 'Failed to process form submission', success: false },
      { status: 500 }
    )
  }
} 