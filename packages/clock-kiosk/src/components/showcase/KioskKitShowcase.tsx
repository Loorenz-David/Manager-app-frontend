import { useState } from 'react';
import { KioskFrame } from '../chrome/KioskFrame';
import { KioskHeader } from '../chrome/KioskHeader';
import { DeviceSignInCard } from '../device/DeviceSignInCard';
import {
  DeviceSettingsPanel,
  DeviceSettingsRow,
} from '../device/DeviceSettingsPanel';
import { KioskButton } from '../shared/KioskButton';
import { KeypadScreen, type KeypadMode } from '../keypad/KeypadScreen';
import { IdentityConfirmScreen } from '../confirm/IdentityConfirmScreen';
import { ResultScreen } from '../result/ResultScreen';
import { SummaryScreen } from '../summary/SummaryScreen';
import { AnnouncementsList } from '../announcements/AnnouncementsList';

type Screen =
  | 'keypad'
  | 'confirm-in'
  | 'confirm-out'
  | 'result-in'
  | 'result-out'
  | 'summary'
  | 'sign-in'
  | 'settings';

/**
 * Dev-only visual review harness for the kit. Local state fakes the flow with
 * the design handoff's demo codes: 4271 → clock-in path, 8306 → clock-out
 * path, anything else → shake. It ships no real logic and is excluded from
 * production paths (never imported by real pages).
 */
export function KioskKitShowcase(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('keypad');
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<KeypadMode>('code');
  const [email, setEmail] = useState('');

  const header = (
    <KioskHeader
      date="Wednesday 29 July"
      terminalLabel="Terminal 04 · Bay B"
      time="15:14"
      workspaceName="Northbay Works"
    />
  );

  const resetKeypad = () => {
    setScreen('keypad');
    setCode('');
    setEmail('');
    setError(false);
    setMode('code');
  };

  const trySubmit = (value: string) => {
    if (value === '4271') {
      setError(false);
      setScreen('confirm-in');
    } else if (value === '8306') {
      setError(false);
      setScreen('confirm-out');
    } else {
      setError(true);
      setCode('');
    }
  };

  const handleDigit = (digit: string) => {
    setError(false);
    const next = (code + digit).slice(0, 4);
    setCode(next);
    if (next.length === 4) trySubmit(next);
  };

  if (screen === 'sign-in' || screen === 'settings') {
    return (
      <KioskFrame header={header}>
        {screen === 'settings' ? (
          <DeviceSettingsPanel
            footer={
              <KioskButton size="md" variant="danger">
                Log out this terminal…
              </KioskButton>
            }
            subtitle="Only managers should be here. Changes apply to this device only."
            title="Terminal settings"
          >
            <DeviceSettingsRow
              control={
                <span className="font-kiosk-mono text-[15px] text-kiosk-ink">
                  Terminal 04 · Bay B
                </span>
              }
              description="Shown in the header and on every screen."
              label="Terminal label"
            />
            <DeviceSettingsRow
              control={
                <span className="font-kiosk-mono text-[15px] text-kiosk-ink">
                  12s
                </span>
              }
              description="How long result screens wait before returning to the keypad."
              label="Auto-return delay"
            />
          </DeviceSettingsPanel>
        ) : (
          <DeviceSignInCard
            footnote="floor scope · manager or admin account"
            subtitle="Sign in with a manager account to bind this device to the floor. The session never expires until the device is logged out."
            title="Set up this terminal"
          >
            <div className="h-14 rounded-2xl bg-kiosk-canvas" />
            <div className="h-14 rounded-2xl bg-kiosk-canvas" />
            <div className="h-14 rounded-2xl bg-kiosk-canvas" />
            <KioskButton size="md" variant="accent">
              Sign in
            </KioskButton>
          </DeviceSignInCard>
        )}
        <div className="pb-6">
          <KioskButton onClick={resetKeypad} size="md" variant="ghost">
            Showcase: back to keypad
          </KioskButton>
        </div>
      </KioskFrame>
    );
  }

  if (screen === 'confirm-in' || screen === 'confirm-out') {
    const isClockIn = screen === 'confirm-in';
    return (
      <KioskFrame header={header}>
        <IdentityConfirmScreen
          action={isClockIn ? 'clock_in' : 'clock_out'}
          context={
            isClockIn ? null : { label: 'Clocked in at', value: '06:58' }
          }
          onAction={() => setScreen(isClockIn ? 'result-in' : 'result-out')}
          onBack={resetKeypad}
          pending={false}
          user={{
            name: isClockIn ? 'Marco Ferreira' : 'Dana Whitlock',
            roleLine: isClockIn ? 'Assembly · Line 3' : 'Pick & Pack',
            avatarUrl: null,
          }}
        />
      </KioskFrame>
    );
  }

  if (screen === 'result-in' || screen === 'result-out') {
    const isClockIn = screen === 'result-in';
    return (
      <KioskFrame header={header}>
        <ResultScreen
          announcementsSlot={
            isClockIn ? (
              <AnnouncementsList
                items={[
                  {
                    title: 'Line 3 changeover at 11:00',
                    body: 'Swap to the 60mm die set — Priya will run the checklist with you.',
                    accent: 'info',
                  },
                  {
                    title: 'Safety walk today',
                    body: 'Keep gangway B clear between 13:00 and 14:00.',
                    accent: 'success',
                  },
                  {
                    title: 'Payslips are out',
                    body: 'June statements are on the noticeboard tablet.',
                    accent: 'neutral',
                  },
                ]}
              />
            ) : undefined
          }
          countdownSeconds={9}
          greeting={
            isClockIn ? 'Good afternoon, Marco' : 'Shift complete, Dana'
          }
          notice={isClockIn ? null : '2 active tasks were stopped'}
          onDone={resetKeypad}
          plate={
            isClockIn
              ? {
                  label: 'Clocked in at',
                  time: '15:15',
                  right: { label: 'Scheduled', value: '07:00 – 15:30' },
                }
              : null
          }
          subtitle={
            isClockIn
              ? "You're clocked in for today's shift"
              : 'Your shift has been recorded'
          }
          variant={isClockIn ? 'in' : 'out'}
        />
      </KioskFrame>
    );
  }

  if (screen === 'summary') {
    return (
      <KioskFrame header={header}>
        <SummaryScreen
          avatarUrl={null}
          countdownSeconds={20}
          insights={[
            {
              text: '8h 12m worked against an 8h scheduled shift',
              delta: { value: '+12m', polarity: 'positive' },
            },
            {
              text: '142 units completed vs 5-day average of 130',
              delta: { value: '+9%', polarity: 'positive' },
            },
            {
              text: '39.9h logged this week of 40h scheduled',
              delta: { value: '−0.1h', polarity: 'negative' },
            },
          ]}
          items={{
            totalUnits: 142,
            lineCount: 4,
            items: [
              { name: 'Hex bolt M8', imageUrl: null, units: 52 },
              { name: 'Rail bracket', imageUrl: null, units: 38 },
              { name: 'Drive belt 40"', imageUrl: null, units: 31 },
              { name: 'Cap assembly', imageUrl: null, units: 21 },
            ],
          }}
          name="Dana Whitlock"
          notice="2 active tasks were stopped"
          onDone={resetKeypad}
          rate={{ unitsPerHour: 17.3, baseline: 15.9, baselineDays: 5 }}
          subtitle="Pick & Pack · Wednesday 29 July"
          title="Shift complete, Dana"
          week={{
            targetSeconds: 144000,
            loggedSeconds: 143640,
            days: [
              { label: 'Mon', workedSeconds: 28800, isToday: false },
              { label: 'Tue', workedSeconds: 28380, isToday: false },
              { label: 'Wed', workedSeconds: 29100, isToday: false },
              { label: 'Thu', workedSeconds: 27840, isToday: false },
              { label: 'Fri', workedSeconds: 29520, isToday: true },
            ],
          }}
          worked={{ worked: '8h 12m', in: '06:58', out: '15:00' }}
        />
      </KioskFrame>
    );
  }

  return (
    <KioskFrame
      footer={
        <div className="flex justify-center gap-6">
          <button
            className="min-h-11 text-[13px] text-kiosk-tertiary"
            onClick={() => setScreen('sign-in')}
            type="button"
          >
            Showcase: sign-in
          </button>
          <button
            className="min-h-11 text-[13px] text-kiosk-tertiary"
            onClick={() => setScreen('settings')}
            type="button"
          >
            Showcase: settings
          </button>
          <button
            className="min-h-11 text-[13px] text-kiosk-tertiary"
            onClick={() => setScreen('summary')}
            type="button"
          >
            Showcase: summary
          </button>
        </div>
      }
      header={header}
    >
      <KeypadScreen
        code={code}
        emailValue={email}
        error={error}
        mode={mode}
        onDelete={() => {
          setError(false);
          setCode(code.slice(0, -1));
        }}
        onDigit={handleDigit}
        onEmailChange={(value) => {
          setError(false);
          setEmail(value);
        }}
        onEmailSubmit={() => trySubmit('')}
        onModeChange={(next) => {
          setMode(next);
          setError(false);
        }}
        onSubmit={() => trySubmit(code)}
      />
    </KioskFrame>
  );
}
