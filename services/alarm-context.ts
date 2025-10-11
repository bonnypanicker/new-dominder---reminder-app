let _launchedBy: 'fullscreen' | 'bodytap' | 'inapp' | null = null;

export function setAlarmLaunchOrigin(v: 'fullscreen' | 'bodytap' | 'inapp') {
  _launchedBy = v;
}
export function getAlarmLaunchOrigin() {
  return _launchedBy;
}
export function clearAlarmLaunchOrigin() {
  _launchedBy = null;
}