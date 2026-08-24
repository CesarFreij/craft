import { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { motion } from 'framer-motion'
import craftImage from '../assets/craft.png'

function AnalogClock({ time }: { time: Date }) {
  const localTimeMs =
    time.getTime() - time.getTimezoneOffset() * 60_000

  const continuousSeconds = localTimeMs / 1000

  const secondDeg = continuousSeconds * 6
  const minuteDeg = continuousSeconds * 0.1
  const hourDeg = continuousSeconds / 120

  const minuteMarks = Array.from({ length: 60 }, (_, index) => index)

  const hourNumbers = [
    { value: '12', x: 160, y: 58 },
    { value: '3', x: 263, y: 166 },
    { value: '6', x: 160, y: 272 },
    { value: '9', x: 57, y: 166 },
  ]

  // باقي الكود كما هو...

  return (
    <Box
      sx={{
        width: 'clamp(240px, 25vw, 330px)',
        aspectRatio: '1',
        flexShrink: 0,
        filter: 'drop-shadow(0 28px 42px rgba(2, 6, 23, 0.28))',
      }}
    >
      <svg
        viewBox="0 0 320 320"
        width="100%"
        height="100%"
        role="img"
        aria-label="ساعة عقارب"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="clock-face" cx="35%" cy="28%" r="78%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="68%" stopColor="#FAFCFF" />
            <stop offset="100%" stopColor="#EEF4FF" />
          </radialGradient>

          <linearGradient id="clock-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>

          <filter id="clock-inner-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="5"
              stdDeviation="7"
              floodColor="#0F172A"
              floodOpacity="0.09"
            />
          </filter>
        </defs>

        <circle cx="160" cy="160" r="157" fill="rgba(255,255,255,0.22)" />
        <circle cx="160" cy="160" r="152" fill="url(#clock-ring)" />
        <circle cx="160" cy="160" r="143" fill="#FFFFFF" />
        <circle
          cx="160"
          cy="160"
          r="136"
          fill="url(#clock-face)"
          filter="url(#clock-inner-shadow)"
        />
        <circle
          cx="160"
          cy="160"
          r="120"
          fill="none"
          stroke="#DBEAFE"
          strokeWidth="1.2"
        />

        {minuteMarks.map((mark) => {
          const angle = (mark * 6 * Math.PI) / 180
          const isHour = mark % 5 === 0

          const outerRadius = 128
          const innerRadius = isHour ? 115 : 123

          const x1 = 160 + Math.sin(angle) * innerRadius
          const y1 = 160 - Math.cos(angle) * innerRadius
          const x2 = 160 + Math.sin(angle) * outerRadius
          const y2 = 160 - Math.cos(angle) * outerRadius

          return (
            <line
              key={mark}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isHour ? '#334155' : '#CBD5E1'}
              strokeWidth={isHour ? 3 : 1.35}
              strokeLinecap="round"
            />
          )
        })}

        {hourNumbers.map((item) => (
          <text
            key={item.value}
            x={item.x}
            y={item.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#0F172A"
            fontSize="17"
            fontWeight="800"
          >
            {item.value}
          </text>
        ))}

        <text
          x="160"
          y="108"
          textAnchor="middle"
          fill="#2563EB"
          fontSize="13"
          fontWeight="900"
          letterSpacing="2.2"
        >
          CRAFT
        </text>
        <text
          x="160"
          y="124"
          textAnchor="middle"
          fill="#94A3B8"
          fontSize="7.5"
          fontWeight="700"
          letterSpacing="1.5"
        >
          ERP SYSTEM
        </text>

        <g
          style={{
            transformOrigin: '160px 160px',
            transform: `rotate(${hourDeg}deg)`,
            transition: 'transform 180ms linear',
          }}
        >
          <line
            x1="160"
            y1="174"
            x2="160"
            y2="101"
            stroke="#0F172A"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </g>

        <g
          style={{
            transformOrigin: '160px 160px',
            transform: `rotate(${minuteDeg}deg)`,
            transition: 'transform 180ms linear',
          }}
        >
          <line
            x1="160"
            y1="176"
            x2="160"
            y2="78"
            stroke="#2563EB"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
        </g>

        <g
          style={{
            transformOrigin: '160px 160px',
            transform: `rotate(${secondDeg}deg)`,
            transition: 'transform 120ms linear',
          }}
        >
          <line
            x1="160"
            y1="183"
            x2="160"
            y2="69"
            stroke="#06B6D4"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>

        <circle cx="160" cy="160" r="11" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="5" />
        <circle cx="160" cy="160" r="3.2" fill="#06B6D4" />
      </svg>
    </Box>
  )
}

export function HomePage() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <Box
      dir="rtl"
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
        bgcolor: '#07142F',
      }}
    >
      <Box
        component={motion.section}
        initial={{ opacity: 0, scale: 0.992 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        sx={{
          position: 'relative',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
          bgcolor: '#0B1636',
          boxShadow: '0 18px 45px rgba(2, 6, 23, 0.16)',
        }}
      >
        <Box
          component="img"
          src={craftImage}
          alt="CRAFT"
          sx={{
            position: 'absolute',
            width: '1920px',
            height: '1080px',
            maxWidth: 'none',
            maxHeight: 'none',
            top: 'calc(50% + 45px)',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            objectFit: 'cover',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `
              linear-gradient(
                90deg,
                rgba(3, 14, 45, 0.98) 0%,
                rgba(5, 24, 65, 0.88) 34%,
                rgba(5, 27, 72, 0.48) 68%,
                rgba(2, 12, 34, 0.18) 100%
              )
            `,
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(15,23,42,0.04) 0%, rgba(15,23,42,0.06) 55%, rgba(2,6,23,0.34) 100%)',
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            insetInlineEnd: '-11%',
            top: '-31%',
            width: '52vw',
            height: '52vw',
            maxWidth: 760,
            maxHeight: 760,
            borderRadius: '50%',
            border: '1px solid rgba(96, 165, 250, 0.18)',
            boxShadow:
              '0 0 0 50px rgba(37,99,235,0.035), 0 0 0 110px rgba(6,182,212,0.025)',
            pointerEvents: 'none',
          }}
        />

        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            height: '100%',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'minmax(430px, 1.15fr) minmax(330px, 0.85fr)',
            },
            alignItems: 'center',
            gap: { xs: 1, md: 3 },
            px: { xs: 3, sm: 5, md: 8, xl: 11 },
            py: { xs: 3, md: 5 },
          }}
        >
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gridColumn: { md: '2' },
              gridRow: { md: '1' },
            }}
          >
            <Box
              component={motion.div}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }}
              sx={{
                position: 'relative',
                p: 2.25,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.035) 62%, rgba(255,255,255,0) 70%)',
              }}
            >
              <AnalogClock time={now} />
            </Box>
          </Box>

          <Box
            component={motion.div}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            sx={{
              minWidth: 0,
              maxWidth: 700,
              justifySelf: { xs: 'stretch' },
              gridColumn: { md: '1' },
              gridRow: { md: '1' },
              direction: 'rtl',
              textAlign: 'right',
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.8,
                mb: 2.3,
                borderRadius: 99,
                border: '1px solid rgba(255,255,255,0.17)',
                bgcolor: 'rgba(255,255,255,0.075)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#22D3EE',
                  boxShadow: '0 0 0 5px rgba(34,211,238,0.12)',
                }}
              />
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.86)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                }}
              >
                CRAFT ERP
              </Typography>
            </Box>

            <Typography
              sx={{
                color: '#FFFFFF',
                fontSize: {
                  xs: 'clamp(42px, 9vw, 64px)',
                  md: 'clamp(64px, 6.4vw, 98px)',
                },
                lineHeight: 0.9,
                fontWeight: 950,
                letterSpacing: '-0.045em',
                textShadow: '0 12px 35px rgba(2, 6, 23, 0.34)',
                textAlign: { xs: 'center', md: 'right' },
              }}
            >
              CRAFT
            </Typography>

            <Typography
              sx={{
                color: '#FFFFFF',
                fontSize: { xs: 22, md: 28, xl: 32 },
                lineHeight: 1.45,
                fontWeight: 850,
                maxWidth: 650,
                direction: 'ltr',
                textAlign: 'right',
              }}
            >
              من أول مادة… إلى آخر منتج.
              <Box component="span" sx={{ display: 'block', color: '#67E8F9', mt: 0.35 }}>
                كل دورة العمل تحت سيطرتك.
              </Box>
            </Typography>

            <Typography
              sx={{
                mt: 2.2,
                color: 'rgba(226, 232, 240, 0.82)',
                fontSize: { xs: 13.5, md: 14.5 },
                lineHeight: 1.9,
                maxWidth: 590,
                fontWeight: 500,
                direction: 'ltr',
                textAlign: 'right',
              }}
            >
              CRAFT يجمع المواد والمخزون والمشتريات والمبيعات والتصنيع في بيئة تشغيل واحدة مترابطة، لتتابع كل حركة بوضوح، وتنجز أعمالك بسرعة، وتحافظ على دقة بياناتك من أول خطوة حتى المنتج النهائي.
            </Typography>

            <Box
              sx={{
                mt: { xs: 2.6, md: 3.2 },
                width: 'min(100%, 520px)',
                height: 1,
                background:
                  'linear-gradient(90deg, rgba(103,232,249,0.58), rgba(255,255,255,0.10), transparent)',
              }}
            />

            <Typography
              sx={{
                mt: 1.3,
                color: 'rgba(203, 213, 225, 0.63)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.7,
                direction: 'rtl',
                textAlign: 'right',
              }}
            >
              CRAFT • MANUFACTURING MANAGEMENT SYSTEM
            </Typography>
          </Box>

          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              position: 'absolute',
              insetInlineEnd: 18,
              bottom: 18,
              transform: 'scale(0.63)',
              transformOrigin: 'bottom right',
              opacity: 0.96,
            }}
          >
            <AnalogClock time={now} />
          </Box>
        </Box>

        <Box
          sx={{
            position: 'absolute',
            insetInlineStart: 0,
            insetInlineEnd: 0,
            bottom: 0,
            height: 4,
            opacity: 0.95,
          }}
        />
      </Box>
    </Box>
  )
}

export default HomePage
