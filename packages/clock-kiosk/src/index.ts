// @beyo/clock-kiosk — the shop-floor clock-in/out kiosk experience.
//
// Phase 3 state: chrome kit only (Claude-owned presentational components).
// The kiosk flow (store, controller, provider, pages, surface registrations)
// arrives in Phase 4 and will extend this public API.
//
// Codex: these component files are READ-ONLY per the master's division of
// labor — additive optional props only; DOM/classes/styling changes go
// through a Claude session.

export { KioskFrame } from './components/chrome/KioskFrame';
export { KioskHeader } from './components/chrome/KioskHeader';
export { DeviceSignInCard } from './components/device/DeviceSignInCard';
export {
  DeviceSettingsPanel,
  DeviceSettingsRow,
} from './components/device/DeviceSettingsPanel';
export { KioskButton } from './components/shared/KioskButton';

// Phase 4 kit — core flow screens (presentational; flow logic arrives with
// the Phase 4 Codex session).
export { KeypadScreen, type KeypadMode } from './components/keypad/KeypadScreen';
export { CodeCells } from './components/keypad/CodeCells';
export { Keypad } from './components/keypad/Keypad';
export {
  IdentityConfirmScreen,
  type ConfirmAction,
} from './components/confirm/IdentityConfirmScreen';
export { ResultScreen } from './components/result/ResultScreen';
export { CheckHero } from './components/result/CheckHero';
export { DarkTimePlate } from './components/result/DarkTimePlate';
export { AutoReturnFooter } from './components/result/AutoReturnFooter';

// KioskKitShowcase deliberately NOT exported here — dev-only, import from
// `@beyo/clock-kiosk/showcase` (Phase 3 review finding C11).
