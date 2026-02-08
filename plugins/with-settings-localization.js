module.exports = function withSettingsLocalization(config, props = {}) {
  const alarmToneLabel = props.alarmToneLabel ?? 'Default Alarm Tone';
  const localization = {
    ...(config.extra?.localization ?? {}),
    alarmToneLabel,
  };
  config.extra = { ...(config.extra ?? {}), localization };
  return config;
};
