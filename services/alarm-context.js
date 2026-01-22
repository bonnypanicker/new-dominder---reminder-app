let _launchedBy = null;
export function setAlarmLaunchOrigin(v) {
    _launchedBy = v;
}
export function getAlarmLaunchOrigin() {
    return _launchedBy;
}
export function clearAlarmLaunchOrigin() {
    _launchedBy = null;
}
