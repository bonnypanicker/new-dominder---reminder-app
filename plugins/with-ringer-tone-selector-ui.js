const { withDangerousMod, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const testContent = `package app.rork.dominder_android_reminder_app

import android.app.Activity
import android.app.Instrumentation
import android.content.Intent
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.doesNotExist
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.intent.Intents.intended
import androidx.test.espresso.intent.Intents.intending
import androidx.test.espresso.intent.matcher.IntentMatchers.hasComponent
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import app.rork.dominder_android_reminder_app.alarm.RingtonePickerActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class RingerToneSelectorTest {
    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun ringerToneSelectorFlow() {
        Intents.init()
        onView(withContentDescription("fab-create-reminder")).perform(click())
        onView(withContentDescription("ringer-tone-selector")).check(doesNotExist())
        onView(withContentDescription("priority-option-high")).perform(click())
        onView(withContentDescription("ringer-tone-selector")).check(matches(isDisplayed()))
        val resultData = Intent().putExtra("selectedUri", "content://com.dominder/custom")
        val result = Instrumentation.ActivityResult(Activity.RESULT_OK, resultData)
        intending(hasComponent(RingtonePickerActivity::class.java.name)).respondWith(result)
        onView(withContentDescription("ringer-tone-selector")).perform(click())
        intended(hasComponent(RingtonePickerActivity::class.java.name))
        Thread.sleep(500)
        onView(withContentDescription("ringer-tone-selector-dot")).check(matches(isDisplayed()))
        Intents.release()
    }
}
`;

module.exports = function withRingerToneSelectorUi(config, props = {}) {
  const enableRingerToneSelector = props.enableRingerToneSelector ?? true;
  config.extra = { ...(config.extra ?? {}), enableRingerToneSelector };

  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      let buildGradle = cfg.modResults.contents;
      const deps = [
        "androidTestImplementation 'androidx.test.ext:junit:1.1.5'",
        "androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'",
        "androidTestImplementation 'androidx.test.espresso:espresso-intents:3.5.1'",
        "androidTestImplementation 'androidx.test:runner:1.5.2'",
        "androidTestImplementation 'androidx.test:rules:1.5.0'"
      ];
      const missing = deps.filter(dep => !buildGradle.includes(dep));
      if (missing.length > 0 && /dependencies\s*{/.test(buildGradle)) {
        buildGradle = buildGradle.replace(
          /dependencies\s*{/,
          `dependencies {\n    ${missing.join('\n    ')}`
        );
        cfg.modResults.contents = buildGradle;
      }
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const testDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'androidTest',
        'java',
        'app',
        'rork',
        'dominder_android_reminder_app'
      );
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'RingerToneSelectorTest.kt'), testContent);
      return cfg;
    },
  ]);

  return config;
};
