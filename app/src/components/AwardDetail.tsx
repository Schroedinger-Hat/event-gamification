'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Award } from '@/types'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, X } from 'lucide-react'
import confetti from 'canvas-confetti'
import Image from 'next/image'
import { urlForImage } from '@/lib/sanity.image'
import { Button } from './ui/button'
import { Card, CardHeader, CardContent, CardFooter, CardSection } from './ui/Card'
import { getBasePublicUrl } from '@/lib/utils/getBasePublicUrl'

interface Props {
  award: Award
}

export function AwardDetail({ award }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isCompleted = searchParams.get('completed') === 'true'
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const baseUrl = getBasePublicUrl()

  useEffect(() => {
    if (isCompleted) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    }

    // Get user email from cookie
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('user_token='))
    
    if (token) {
      const { email } = JSON.parse(decodeURIComponent(token.split('=')[1]))
      setUserEmail(email)
    }
  }, [isCompleted])

  const checkAwardStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/awards/${award._id}`)
      const data = await response.json()

      if (data.isCompleted) {
        setShowQR(false)
        router.push(`/award/${award._id}?completed=true`)
        return true
      }
      return false
    } catch (error) {
      console.error('Error checking challenge status:', error)
      return false
    }
  }, [award._id, router])

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (showQR) {
      intervalId = setInterval(async () => {
        const isComplete = await checkAwardStatus()
        if (isComplete && intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      }, 5000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }
  }, [showQR, checkAwardStatus])

  const verificationUrl = `${baseUrl}/api/admin/verify-award?awardId=${award._id}&email=${userEmail}`

  const handleRedeem = async () => {
    if (award.isSupervised) {
      setShowQR(true)
      return
    }

    setIsRedeeming(true)
    try {
      const response = await fetch(`/api/awards/${award._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardId: award._id }),
      })

      if (!response.ok) {
        throw new Error('Failed to redeem award')
      }

      router.push(`/award/${award._id}?completed=true`)
    } catch (error) {
      console.error('Error redeeming award:', error)
    } finally {
      setIsRedeeming(false)
    }
  }

  if (isCompleted) {
    return (
      <Card variant="celebration">
        <div className="w-32 h-32 mx-auto relative mb-6">
          <Image
            src={urlForImage(award.image).url()}
            alt={award.name}
            fill
            className="object-cover rounded-lg"
          />
        </div>
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Congratulations!</h1>
        <p className="text-neutral-600 mb-4">
          You&apos;ve earned the {award.name} award and {award.points} points!
        </p>
        <Button
          onClick={() => window.location.href = '/dashboard?view=award'}
          variant="accent"
        >
          View All Awards
        </Button>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="w-32 h-32 relative flex-shrink-0">
          <Image
            src={urlForImage(award.image).url()}
            alt={award.name}
            fill
            className="object-cover rounded-lg"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">{award.name}</h1>
          <span className="text-blue-600 font-bold">
            {award.points} pts
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <p>{award.description}</p>
        
        {award.instructions && (
          <>
            <h2>Instructions</h2>
            <p>{award.instructions}</p>
          </>
        )}
      </CardContent>

      <CardFooter>
        {award.isSupervised ? (
          <CardSection>
            <h3 className="font-semibold mb-2">Verification Required</h3>
            <p className="text-sm text-neutral-600">
              This award needs to be verified by a supervisor. Click the button below
              to generate a QR code for verification.
            </p>
          </CardSection>
        ) : (
          <CardSection>
            <p className="text-sm text-neutral-600">
              Click the button below to claim this award.
            </p>
          </CardSection>
        )}
        
        <Button
          onClick={handleRedeem}
          disabled={isRedeeming}
          variant="accent"
          className="w-full"
        >
          {isRedeeming ? 'Redeeming...' : 
            award.isSupervised ? 'Generate Verification QR' : 'Claim Award'}
        </Button>
      </CardFooter>

      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-2 right-2 p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-lg font-semibold mb-4">
              Show this QR code to a supervisor
            </h3>

            <div className="bg-white p-4 rounded-lg flex justify-center">
              <QRCodeSVG
                value={verificationUrl}
                size={200}
                level="H"
                includeMargin
              />
            </div>

            <p className="mt-4 text-sm text-gray-600">
              A supervisor will scan this code to verify your award completion.
            </p>
          </div>
        </div>
      )}
    </Card>
  )
} 