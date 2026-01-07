Running 'gradlew :app:assembleRelease' in /home/expo/workingdir/build/android
Welcome to Gradle 8.13!
Here are the highlights of this release:
 - Daemon JVM auto-provisioning
 - Enhancements for Scala plugin and JUnit testing
 - Improvements for build authors and plugin developers
For more details see https://docs.gradle.org/8.13/release-notes.html
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.13/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Configure project :expo-gradle-plugin:expo-autolinking-plugin-shared
w: file:///home/expo/workingdir/build/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin-shared/build.gradle.kts:32:9: The expression is unused
> Task :gradle-plugin:shared:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:checkKotlinGradlePluginConfigurationErrors
> Task :gradle-plugin:settings-plugin:pluginDescriptors
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:pluginDescriptors
> Task :gradle-plugin:settings-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:processResources NO-SOURCE
> Task :gradle-plugin:shared:processResources
NO-SOURCE
> Task :gradle-plugin:shared:compileKotlin
> Task :gradle-plugin:shared:compileJava NO-SOURCE
> Task :gradle-plugin:shared:classes UP-TO-DATE
> Task :gradle-plugin:shared:jar
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:compileKotlin
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:compileJava NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:classes UP-TO-DATE
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:jar
> Task :gradle-plugin:settings-plugin:compileKotlin
> Task :gradle-plugin:settings-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:settings-plugin:classes
> Task :gradle-plugin:settings-plugin:jar
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:compileKotlin
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:compileJava
NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:classes
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:jar
> Task :expo-gradle-plugin:expo-autolinking-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-module-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-module-gradle-plugin:pluginDescriptors
> Task :expo-module-gradle-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-plugin:pluginDescriptors
> Task :expo-gradle-plugin:expo-autolinking-plugin:processResources
> Task :gradle-plugin:react-native-gradle-plugin:pluginDescriptors
> Task :gradle-plugin:react-native-gradle-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-plugin:compileKotlin
w: file:///home/expo/workingdir/build/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingPlugin.kt:29:71 Name shadowed: project
> Task :expo-gradle-plugin:expo-autolinking-plugin:compileJava NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-plugin:classes
> Task :expo-gradle-plugin:expo-autolinking-plugin:jar
> Task :gradle-plugin:react-native-gradle-plugin:compileKotlin
> Task :gradle-plugin:react-native-gradle-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:react-native-gradle-plugin:classes
> Task :gradle-plugin:react-native-gradle-plugin:jar
> Task :expo-module-gradle-plugin:compileKotlin
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/android/AndroidLibraryExtension.kt:9:24 'targetSdk: Int?' is deprecated. Will be removed from library DSL in v9.0. Use testOptions.targetSdk or/and lint.targetSdk instead
> Task :expo-module-gradle-plugin:compileJava NO-SOURCE
> Task :expo-module-gradle-plugin:classes
> Task :expo-module-gradle-plugin:jar
> Configure project :
[32m[ExpoRootProject][0m Using the following versions:
  - buildTools:  [32m35.0.0[0m
  - minSdk:      [32m24[0m
  - compileSdk:  [32m35[0m
  - targetSdk:   [32m35[0m
  - ndk:         [32m27.1.12297006[0m
  - kotlin:      [32m2.0.21[0m
  - ksp:         [32m2.0.21-1.0.28[0m
> Configure project :app
Checking the license for package NDK (Side by side) 27.1.12297006 in /home/expo/Android/Sdk/licenses
License for package NDK (Side by side) 27.1.12297006 accepted.
Preparing "Install NDK (Side by side) 27.1.12297006 v.27.1.12297006".
"Install NDK (Side by side) 27.1.12297006 v.27.1.12297006" ready.
Installing NDK (Side by side) 27.1.12297006 in /home/expo/Android/Sdk/ndk/27.1.12297006
"Install NDK (Side by side) 27.1.12297006 v.27.1.12297006" complete.
"Install NDK (Side by side) 27.1.12297006 v.27.1.12297006" finished.
> Configure project :expo
Using expo modules
  - [32mexpo-constants[0m (17.1.7)
  - [32mexpo-modules-core[0m (2.5.0)
- [33m[📦][0m [32mexpo-asset[0m (11.1.7)
  - [33m[📦][0m [32mexpo-blur[0m (14.1.5)
  - [33m[📦][0m [32mexpo-file-system[0m (18.1.11)
  - [33m[📦][0m [32mexpo-font[0m (13.3.2)
  - [33m[📦][0m [32mexpo-haptics[0m (14.1.4)
  - [33m[📦][0m [32mexpo-image[0m (2.4.1)
  - [33m[📦][0m [32mexpo-keep-awake[0m (14.1.4)
  - [33m[📦][0m [32mexpo-linear-gradient[0m (14.1.5)
  - [33m[📦][0m [32mexpo-linking[0m (7.1.7)
  - [33m[📦][0m [32mexpo-screen-orientation[0m (8.1.7)
  - [33m[📦][0m [32mexpo-splash-screen[0m (0.30.10)
  - [33m[📦][0m [32mexpo-system-ui[0m (5.0.11)
  - [33m[📦][0m [32mexpo-web-browser[0m (14.2.0)
> Configure project :notifee_react-native
:notifee_react-native @notifee/react-native found at /home/expo/workingdir/build/node_modules/@notifee/react-native
:notifee_react-native package.json found at /home/expo/workingdir/build/node_modules/@notifee/react-native/package.json
:notifee_react-native:version set from package.json: 9.1.8 (9,1,8 - 9001008)
:notifee_react-native:android.compileSdk using custom value: 35
:notifee_react-native:android.targetSdk using custom value: 35
:notifee_react-native:android.minSdk using custom value: 24
:notifee_react-native:reactNativeAndroidDir /home/expo/workingdir/build/node_modules/react-native/android
> Task :expo-modules-core:preBuild UP-TO-DATE
> Task :expo-modules-core:preReleaseBuild UP-TO-DATE
> Task :expo-modules-core:writeReleaseAarMetadata
> Task :notifee_react-native:preBuild UP-TO-DATE
> Task :notifee_react-native:preReleaseBuild UP-TO-DATE
> Task :notifee_react-native:writeReleaseAarMetadata
> Task :app:buildKotlinToolingMetadata
> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :app:generateAutolinkingNewArchitectureFiles
> Task :app:generateAutolinkingPackageList
> Task :app:generateCodegenSchemaFromJavaScript SKIPPED
> Task :app:generateCodegenArtifactsFromSchema SKIPPED
> Task :app:preBuild
> Task :app:preReleaseBuild
> Task :app:generateReleaseBuildConfig
> Task :react-native-async-storage_async-storage:generateCodegenSchemaFromJavaScript
> Task :expo-constants:createExpoConfig
> Task :expo-constants:preBuild
> Task :expo-constants:preReleaseBuild
> Task :expo-constants:writeReleaseAarMetadata
The NODE_ENV environment variable is required but was not specified. Ensure the project is bundled with Expo CLI or NODE_ENV is set. Using only .env.local and .env
> Task :expo:generatePackagesList
> Task :expo:preBuild
> Task :expo:preReleaseBuild
> Task :expo:writeReleaseAarMetadata
> Task :react-native-gesture-handler:generateCodegenSchemaFromJavaScript
> Task :react-native-reanimated:assertMinimalReactNativeVersionTask
> Task :react-native-reanimated:assertNewArchitectureEnabledTask SKIPPED
> Task :react-native-reanimated:assertWorkletsVersionTask
> Task :react-native-async-storage_async-storage:generateCodegenArtifactsFromSchema
> Task :react-native-async-storage_async-storage:preBuild
> Task :react-native-async-storage_async-storage:preReleaseBuild
> Task :react-native-ringtone-manager-new:generateCodegenSchemaFromJavaScript
> Task :react-native-async-storage_async-storage:writeReleaseAarMetadata
No modules to process in combine-js-to-schema-cli. If this is unexpected, please check if you set up your NativeComponent correctly. See combine-js-to-schema.js for how codegen finds modules.
> Task :react-native-gesture-handler:generateCodegenArtifactsFromSchema
> Task :react-native-gesture-handler:preBuild
> Task :react-native-gesture-handler:preReleaseBuild
> Task :react-native-gesture-handler:writeReleaseAarMetadata
> Task :react-native-reanimated:generateCodegenSchemaFromJavaScript
> Task :react-native-safe-area-context:generateCodegenSchemaFromJavaScript
> Task :react-native-ringtone-manager-new:generateCodegenArtifactsFromSchema
> Task :react-native-ringtone-manager-new:preBuild
> Task :react-native-ringtone-manager-new:preReleaseBuild
> Task :react-native-ringtone-manager-new:writeReleaseAarMetadata
> Task :react-native-screens:generateCodegenSchemaFromJavaScript
> Task :react-native-reanimated:generateCodegenArtifactsFromSchema
> Task :react-native-safe-area-context:generateCodegenArtifactsFromSchema
> Task :react-native-safe-area-context:preBuild
> Task :react-native-safe-area-context:preReleaseBuild
> Task :react-native-safe-area-context:writeReleaseAarMetadata
> Task :react-native-reanimated:prepareReanimatedHeadersForPrefabs
> Task :react-native-reanimated:preBuild
> Task :react-native-reanimated:preReleaseBuild
> Task :react-native-reanimated:writeReleaseAarMetadata
> Task :react-native-worklets:assertMinimalReactNativeVersionTask
> Task :react-native-worklets:assertNewArchitectureEnabledTask SKIPPED
> Task :react-native-screens:generateCodegenArtifactsFromSchema
> Task :react-native-screens:preBuild
> Task :react-native-screens:preReleaseBuild
> Task :react-native-svg:generateCodegenSchemaFromJavaScript
> Task :react-native-screens:writeReleaseAarMetadata
> Task :shopify_flash-list:generateCodegenSchemaFromJavaScript
> Task :react-native-worklets:generateCodegenSchemaFromJavaScript
> Task :react-native-svg:generateCodegenArtifactsFromSchema
> Task :react-native-svg:preBuild
> Task :react-native-svg:preReleaseBuild
> Task :shopify_flash-list:generateCodegenArtifactsFromSchema
> Task :shopify_flash-list:preBuild
> Task :shopify_flash-list:preReleaseBuild
> Task :react-native-svg:writeReleaseAarMetadata
> Task :shopify_flash-list:writeReleaseAarMetadata
> Task :expo:generateReleaseResValues
> Task :expo-constants:generateReleaseResValues
> Task :expo:generateReleaseResources
> Task :expo-constants:generateReleaseResources
> Task :react-native-worklets:generateCodegenArtifactsFromSchema
> Task :expo-constants:packageReleaseResources
> Task :expo:packageReleaseResources
> Task :expo-modules-core:generateReleaseResValues
> Task :notifee_react-native:generateReleaseResValues
> Task :notifee_react-native:generateReleaseResources
> Task :expo-modules-core:generateReleaseResources
> Task :react-native-worklets:prepareWorkletsHeadersForPrefabs
> Task :react-native-worklets:preBuild
> Task :react-native-worklets:preReleaseBuild
> Task :notifee_react-native:packageReleaseResources
> Task :expo-modules-core:packageReleaseResources
> Task :react-native-async-storage_async-storage:generateReleaseResValues
> Task :react-native-gesture-handler:generateReleaseResValues
> Task :react-native-worklets:writeReleaseAarMetadata
> Task :react-native-gesture-handler:generateReleaseResources
> Task :react-native-async-storage_async-storage:generateReleaseResources
> Task :react-native-reanimated:generateReleaseResValues
> Task :react-native-reanimated:generateReleaseResources
> Task :react-native-async-storage_async-storage:packageReleaseResources
> Task :react-native-gesture-handler:packageReleaseResources
> Task :react-native-ringtone-manager-new:generateReleaseResValues
> Task :react-native-safe-area-context:generateReleaseResValues
> Task :react-native-ringtone-manager-new:generateReleaseResources
> Task :react-native-safe-area-context:generateReleaseResources
> Task :react-native-reanimated:packageReleaseResources
> Task :react-native-ringtone-manager-new:packageReleaseResources
> Task :react-native-screens:generateReleaseResValues
> Task :react-native-svg:generateReleaseResValues
> Task :react-native-svg:generateReleaseResources
> Task :react-native-safe-area-context:packageReleaseResources
> Task :react-native-worklets:generateReleaseResValues
> Task :react-native-screens:generateReleaseResources
> Task :react-native-worklets:generateReleaseResources
> Task :react-native-svg:packageReleaseResources
> Task :shopify_flash-list:generateReleaseResValues
> Task :shopify_flash-list:generateReleaseResources
> Task :react-native-worklets:packageReleaseResources
> Task :expo:extractDeepLinksRelease
> Task :shopify_flash-list:packageReleaseResources
> Task :expo-constants:extractDeepLinksRelease
> Task :react-native-screens:packageReleaseResources
> Task :expo-modules-core:extractDeepLinksRelease
> Task :expo-modules-core:processReleaseManifest
/home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/AndroidManifest.xml:8:9-11:45 Warning:
	meta-data#com.facebook.soloader.enabled@android:value was tagged at AndroidManifest.xml:8 to replace other declarations but no other declaration present
> Task :expo-constants:processReleaseManifest
> Task :expo:processReleaseManifest
> Task :notifee_react-native:extractDeepLinksRelease
> Task :react-native-async-storage_async-storage:extractDeepLinksRelease
> Task :react-native-gesture-handler:extractDeepLinksRelease
> Task :react-native-async-storage_async-storage:processReleaseManifest
package="com.reactnativecommunity.asyncstorage" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.reactnativecommunity.asyncstorage" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
> Task :react-native-reanimated:extractDeepLinksRelease
> Task :notifee_react-native:processReleaseManifest
package="io.invertase.notifee" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@notifee/react-native/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="io.invertase.notifee" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@notifee/react-native/android/src/main/AndroidManifest.xml.
> Task :react-native-gesture-handler:processReleaseManifest
> Task :react-native-safe-area-context:extractDeepLinksRelease
> Task :react-native-ringtone-manager-new:extractDeepLinksRelease
> Task :react-native-reanimated:processReleaseManifest
> Task :react-native-ringtone-manager-new:processReleaseManifest
package="com.ringtonemanager" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-ringtone-manager-new/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.ringtonemanager" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-ringtone-manager-new/android/src/main/AndroidManifest.xml.
> Task :react-native-safe-area-context:processReleaseManifest
package="com.th3rdwave.safeareacontext" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.th3rdwave.safeareacontext" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
> Task :react-native-screens:extractDeepLinksRelease
> Task :react-native-svg:extractDeepLinksRelease
> Task :react-native-worklets:extractDeepLinksRelease
> Task :react-native-svg:processReleaseManifest
> Task :react-native-screens:processReleaseManifest
> Task :react-native-worklets:processReleaseManifest
> Task :shopify_flash-list:extractDeepLinksRelease
> Task :shopify_flash-list:processReleaseManifest
package="com.shopify.reactnative.flash_list" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@shopify/flash-list/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.shopify.reactnative.flash_list" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@shopify/flash-list/android/src/main/AndroidManifest.xml.
> Task :expo:compileReleaseLibraryResources
> Task :expo-constants:compileReleaseLibraryResources
> Task :expo-modules-core:compileReleaseLibraryResources
> Task :expo-modules-core:parseReleaseLocalResources
> Task :expo-constants:parseReleaseLocalResources
> Task :expo:parseReleaseLocalResources
> Task :expo-modules-core:generateReleaseRFile
> Task :expo:generateReleaseRFile
> Task :expo-constants:generateReleaseRFile
> Task :notifee_react-native:compileReleaseLibraryResources
> Task :react-native-async-storage_async-storage:compileReleaseLibraryResources
> Task :react-native-gesture-handler:compileReleaseLibraryResources
> Task :notifee_react-native:parseReleaseLocalResources
> Task :react-native-async-storage_async-storage:parseReleaseLocalResources
> Task :react-native-gesture-handler:parseReleaseLocalResources
> Task :notifee_react-native:generateReleaseRFile
> Task :react-native-async-storage_async-storage:generateReleaseRFile
> Task :react-native-gesture-handler:generateReleaseRFile
> Task :react-native-ringtone-manager-new:compileReleaseLibraryResources
> Task :react-native-reanimated:compileReleaseLibraryResources
> Task :react-native-safe-area-context:compileReleaseLibraryResources
> Task :react-native-reanimated:parseReleaseLocalResources
> Task :react-native-safe-area-context:parseReleaseLocalResources
> Task :react-native-ringtone-manager-new:parseReleaseLocalResources
> Task :react-native-reanimated:generateReleaseRFile
> Task :react-native-ringtone-manager-new:generateReleaseRFile
> Task :react-native-safe-area-context:generateReleaseRFile
> Task :react-native-svg:compileReleaseLibraryResources
> Task :react-native-screens:parseReleaseLocalResources
> Task :react-native-svg:parseReleaseLocalResources
> Task :react-native-screens:generateReleaseRFile
> Task :react-native-screens:compileReleaseLibraryResources
> Task :react-native-worklets:compileReleaseLibraryResources
> Task :shopify_flash-list:compileReleaseLibraryResources
> Task :react-native-worklets:parseReleaseLocalResources
> Task :react-native-svg:generateReleaseRFile
> Task :expo:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo:generateReleaseBuildConfig
> Task :expo-constants:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :shopify_flash-list:parseReleaseLocalResources
> Task :react-native-worklets:generateReleaseRFile
> Task :expo-modules-core:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-constants:generateReleaseBuildConfig
> Task :expo-modules-core:generateReleaseBuildConfig
> Task :shopify_flash-list:generateReleaseRFile
> Task :expo-constants:javaPreCompileRelease
> Task :notifee_react-native:generateReleaseBuildConfig
> Task :expo:javaPreCompileRelease
> Task :notifee_react-native:javaPreCompileRelease
> Task :react-native-async-storage_async-storage:generateReleaseBuildConfig
> Task :app:createBundleReleaseJsAndAssets
Starting Metro Bundler
Android ./index.js ▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 75.3% (714/911)
Android Bundled 4141ms index.js (1590 modules)
Writing bundle output to: /home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle
Writing sourcemap output to: /home/expo/workingdir/build/android/app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map
Copying 48 asset files
Done writing bundle output
Done writing sourcemap output
> Task :react-native-async-storage_async-storage:javaPreCompileRelease
> Task :notifee_react-native:compileReleaseJavaWithJavac
/home/expo/workingdir/build/node_modules/@notifee/react-native/android/src/main/java/io/invertase/notifee/NotifeeApiModule.java:42: warning: [removal] onCatalystInstanceDestroy() in NativeModule has been deprecated and marked for removal
  public void onCatalystInstanceDestroy() {
              ^
Note: /home/expo/workingdir/build/node_modules/@notifee/react-native/android/src/main/java/io/invertase/notifee/NotifeeReactUtils.java uses or overrides a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
1 warning
> Task :react-native-async-storage_async-storage:compileReleaseJavaWithJavac
> Task :expo-modules-core:javaPreCompileRelease
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/javaPackage/java/com/reactnativecommunity/asyncstorage/AsyncStoragePackage.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :react-native-async-storage_async-storage:bundleLibCompileToJarRelease
> Task :react-native-gesture-handler:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-gesture-handler:generateReleaseBuildConfig
> Task :react-native-reanimated:generateReleaseBuildConfig
> Task :react-native-reanimated:javaPreCompileRelease
> Task :react-native-worklets:generateReleaseBuildConfig
> Task :react-native-worklets:javaPreCompileRelease
> Task :notifee_react-native:bundleLibCompileToJarRelease
> Task :react-native-gesture-handler:javaPreCompileRelease
> Task :react-native-ringtone-manager-new:generateReleaseBuildConfig
> Task :react-native-ringtone-manager-new:javaPreCompileRelease
> Task :react-native-ringtone-manager-new:compileReleaseJavaWithJavac
> Task :react-native-ringtone-manager-new:bundleLibCompileToJarRelease
> Task :react-native-safe-area-context:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-safe-area-context:generateReleaseBuildConfig
Note: /home/expo/workingdir/build/node_modules/react-native-ringtone-manager-new/android/src/main/java/com/ringtonemanager/RingtoneManagerModule.java uses or overrides a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
> Task :react-native-worklets:compileReleaseJavaWithJavac
Note: /home/expo/workingdir/build/node_modules/react-native-worklets/android/src/main/java/com/swmansion/worklets/WorkletsPackage.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :react-native-safe-area-context:compileReleaseKotlin
w: file:///home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/java/com/th3rdwave/safeareacontext/SafeAreaView.kt:59:23 'val uiImplementation: UIImplementation!' is deprecated. Deprecated in Java.
> Task :react-native-worklets:bundleLibCompileToJarRelease
> Task :react-native-reanimated:compileReleaseJavaWithJavac
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: Some input files use unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :react-native-safe-area-context:javaPreCompileRelease
> Task :react-native-safe-area-context:compileReleaseJavaWithJavac
> Task :react-native-reanimated:bundleLibCompileToJarRelease
> Task :expo-modules-core:compileReleaseKotlin
> Task :react-native-safe-area-context:bundleLibCompileToJarRelease
> Task :react-native-screens:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-screens:generateReleaseBuildConfig
> Task :app:checkReleaseAarMetadata
> Task :app:generateReleaseResValues
> Task :app:mapReleaseSourceSetPaths
> Task :app:generateReleaseResources
> Task :app:mergeReleaseResources
> Task :app:packageReleaseResources
> Task :app:parseReleaseLocalResources
> Task :app:createReleaseCompatibleScreenManifests
> Task :app:extractDeepLinksRelease
> Task :react-native-gesture-handler:compileReleaseKotlin
> Task :app:processReleaseMainManifest
/home/expo/workingdir/build/android/app/src/main/AndroidManifest.xml Warning:
	provider#expo.modules.filesystem.FileSystemFileProvider@android:authorities was tagged at AndroidManifest.xml:0 to replace other declarations but no other declaration present
> Task :app:processReleaseManifest
> Task :app:processReleaseManifestForPackage
> Task :react-native-gesture-handler:compileReleaseJavaWithJavac
> Task :react-native-gesture-handler:bundleLibCompileToJarRelease
> Task :react-native-screens:javaPreCompileRelease
> Task :react-native-svg:generateReleaseBuildConfig
> Task :react-native-svg:javaPreCompileRelease
> Task :app:processReleaseResources
> Task :shopify_flash-list:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :shopify_flash-list:generateReleaseBuildConfig
> Task :react-native-svg:compileReleaseJavaWithJavac
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: Some input files use unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :react-native-svg:bundleLibCompileToJarRelease
> Task :shopify_flash-list:javaPreCompileRelease
> Task :app:javaPreCompileRelease
> Task :app:extractProguardFiles
> Task :expo:extractProguardFiles
> Task :expo-constants:extractProguardFiles
> Task :expo-modules-core:extractProguardFiles
> Task :expo-modules-core:prepareLintJarForPublish
> Task :expo-constants:prepareLintJarForPublish
> Task :expo:prepareLintJarForPublish
> Task :notifee_react-native:bundleLibRuntimeToJarRelease
> Task :notifee_react-native:processReleaseJavaRes NO-SOURCE
> Task :notifee_react-native:createFullJarRelease
> Task :notifee_react-native:extractProguardFiles
> Task :shopify_flash-list:compileReleaseKotlin
w: file:///home/expo/workingdir/build/node_modules/@shopify/flash-list/android/src/main/kotlin/com/shopify/reactnative/flash_list/AutoLayoutView.kt:16:8 'interface RCTEventEmitter : JavaScriptModule' is deprecated. Use [RCTModernEventEmitter] instead.
w: file:///home/expo/workingdir/build/node_modules/@shopify/flash-list/android/src/main/kotlin/com/shopify/reactnative/flash_list/BlankAreaEvent.kt:22:18 This declaration overrides a deprecated member but is not marked as deprecated itself. Please add the '@Deprecated' annotation or suppress the diagnostic.
> Task :shopify_flash-list:compileReleaseJavaWithJavac
> Task :shopify_flash-list:bundleLibCompileToJarRelease
> Task :react-native-async-storage_async-storage:bundleLibRuntimeToJarRelease
> Task :react-native-async-storage_async-storage:processReleaseJavaRes NO-SOURCE
> Task :react-native-async-storage_async-storage:createFullJarRelease
> Task :react-native-async-storage_async-storage:extractProguardFiles
> Task :react-native-screens:compileReleaseKotlin
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/RNScreensPackage.kt:66:17 'constructor(name: String, className: String, canOverrideExistingModule: Boolean, needsEagerInit: Boolean, hasConstants: Boolean, isCxxModule: Boolean, isTurboModule: Boolean): ReactModuleInfo' is deprecated. This constructor is deprecated and will be removed in the future. Use ReactModuleInfo(String, String, boolean, boolean, boolean, boolean)].
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:46:77 Unchecked cast of '(androidx.coordinatorlayout.widget.CoordinatorLayout.Behavior<android.view.View!>?..androidx.coordinatorlayout.widget.CoordinatorLayout.Behavior<*>?)' to 'com.google.android.material.bottomsheet.BottomSheetBehavior<com.swmansion.rnscreens.Screen>'.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:378:36 'fun setTranslucent(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:397:36 'fun setColor(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:415:36 'fun setNavigationBarColor(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:432:36 'fun setNavigationBarTranslucent(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:217:31 'var targetElevation: Float' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:220:13 'fun setHasOptionsMenu(p0: Boolean): Unit' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:397:18 This declaration overrides a deprecated member but is not marked as deprecated itself. Please add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:404:22 'fun onPrepareOptionsMenu(p0: Menu): Unit' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:407:18 This declaration overrides a deprecated member but is not marked as deprecated itself. Please add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:412:22 'fun onCreateOptionsMenu(p0: Menu, p1: MenuInflater): Unit' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackHeaderConfigViewManager.kt:7:8 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackHeaderConfigViewManager.kt:210:9 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackHeaderConfigViewManager.kt:212:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackHeaderConfigViewManager.kt:214:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:7:8 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:204:14 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:221:14 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:238:14 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:247:14 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:382:48 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:383:49 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:384:45 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:385:52 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:386:48 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:387:51 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:388:56 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:389:57 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:390:51 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:55:42 'fun replaceSystemWindowInsets(p0: Int, p1: Int, p2: Int, p3: Int): WindowInsetsCompat' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:56:39 'val systemWindowInsetLeft: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:58:39 'val systemWindowInsetRight: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:59:39 'val systemWindowInsetBottom: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:102:53 'var statusBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:106:37 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:113:48 'var statusBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:116:32 'var statusBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:162:49 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:218:43 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:218:72 'var navigationBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:224:16 'var navigationBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:241:55 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:283:13 'fun setColor(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:285:13 'fun setTranslucent(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:289:13 'fun setNavigationBarColor(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:290:13 'fun setNavigationBarTranslucent(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:354:42 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:356:48 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:359:57 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:360:63 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:5:8 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:142:9 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:144:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:146:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:148:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:150:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:152:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:154:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:7:8 'object ReactFeatureFlags : Any' is deprecated. Use com.facebook.react.internal.featureflags.ReactNativeFeatureFlags instead.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:25:13 'object ReactFeatureFlags : Any' is deprecated. Use com.facebook.react.internal.featureflags.ReactNativeFeatureFlags instead.
> Task :expo-modules-core:compileReleaseKotlin
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/apploader/AppLoaderProvider.kt:34:52 Unchecked cast of 'java.lang.Class<*>!' to 'java.lang.Class<out expo.modules.apploader.HeadlessAppLoader>'.
> Task :react-native-screens:compileReleaseJavaWithJavac
> Task :react-native-screens:bundleLibCompileToJarRelease
> Task :react-native-gesture-handler:bundleLibRuntimeToJarRelease
> Task :react-native-gesture-handler:processReleaseJavaRes
> Task :react-native-gesture-handler:createFullJarRelease
> Task :react-native-gesture-handler:extractProguardFiles
> Task :react-native-reanimated:bundleLibRuntimeToJarRelease
> Task :react-native-reanimated:processReleaseJavaRes NO-SOURCE
> Task :react-native-reanimated:createFullJarRelease
> Task :react-native-reanimated:extractProguardFiles
> Task :react-native-worklets:bundleLibRuntimeToJarRelease
> Task :react-native-worklets:processReleaseJavaRes NO-SOURCE
> Task :react-native-worklets:createFullJarRelease
> Task :react-native-worklets:extractProguardFiles
> Task :expo-modules-core:compileReleaseJavaWithJavac
> Task :expo-modules-core:bundleLibCompileToJarRelease
> Task :notifee_react-native:generateReleaseLintModel
> Task :react-native-async-storage_async-storage:generateReleaseLintModel
> Task :notifee_react-native:prepareLintJarForPublish
> Task :expo-modules-core:processReleaseJavaRes
> Task :expo-modules-core:bundleLibRuntimeToJarRelease
> Task :react-native-async-storage_async-storage:prepareLintJarForPublish
> Task :react-native-reanimated:prepareLintJarForPublish
> Task :react-native-gesture-handler:prepareLintJarForPublish
> Task :react-native-ringtone-manager-new:bundleLibRuntimeToJarRelease
> Task :react-native-ringtone-manager-new:processReleaseJavaRes NO-SOURCE
> Task :react-native-ringtone-manager-new:createFullJarRelease
> Task :react-native-ringtone-manager-new:extractProguardFiles
> Task :react-native-ringtone-manager-new:generateReleaseLintModel
> Task :react-native-ringtone-manager-new:prepareLintJarForPublish
> Task :react-native-safe-area-context:bundleLibRuntimeToJarRelease
> Task :react-native-safe-area-context:processReleaseJavaRes
> Task :react-native-safe-area-context:createFullJarRelease
> Task :react-native-safe-area-context:extractProguardFiles
> Task :expo-constants:compileReleaseKotlin
> Task :react-native-safe-area-context:generateReleaseLintModel
> Task :react-native-safe-area-context:prepareLintJarForPublish
> Task :react-native-screens:bundleLibRuntimeToJarRelease
> Task :react-native-screens:processReleaseJavaRes
> Task :react-native-screens:createFullJarRelease
> Task :react-native-screens:extractProguardFiles
> Task :expo-modules-core:generateReleaseLintModel
> Task :expo-modules-core:createFullJarRelease
> Task :react-native-svg:bundleLibRuntimeToJarRelease
> Task :react-native-svg:processReleaseJavaRes NO-SOURCE
> Task :react-native-svg:createFullJarRelease
> Task :react-native-svg:extractProguardFiles
> Task :expo-constants:compileReleaseJavaWithJavac
> Task :react-native-svg:generateReleaseLintModel
> Task :expo-constants:bundleLibRuntimeToJarRelease
> Task :expo-constants:bundleLibCompileToJarRelease
> Task :react-native-svg:prepareLintJarForPublish
> Task :shopify_flash-list:bundleLibRuntimeToJarRelease
> Task :expo-constants:processReleaseJavaRes
> Task :expo-constants:createFullJarRelease
> Task :expo-constants:generateReleaseLintModel
> Task :shopify_flash-list:processReleaseJavaRes
> Task :shopify_flash-list:createFullJarRelease
> Task :shopify_flash-list:extractProguardFiles
> Task :shopify_flash-list:generateReleaseLintModel
> Task :react-native-screens:generateReleaseLintModel
> Task :react-native-screens:prepareLintJarForPublish
> Task :shopify_flash-list:prepareLintJarForPublish
> Task :react-native-safe-area-context:mergeReleaseJniLibFolders
> Task :react-native-gesture-handler:mergeReleaseJniLibFolders
> Task :react-native-gesture-handler:extractDeepLinksForAarRelease
> Task :react-native-safe-area-context:mergeReleaseNativeLibs NO-SOURCE
> Task :react-native-safe-area-context:stripReleaseDebugSymbols NO-SOURCE
> Task :react-native-safe-area-context:copyReleaseJniLibsProjectAndLocalJars
> Task :react-native-safe-area-context:extractDeepLinksForAarRelease
> Task :react-native-worklets:generateReleaseLintModel
> Task :react-native-worklets:prepareLintJarForPublish
> Task :react-native-reanimated:generateReleaseLintModel
> Task :expo:compileReleaseKotlin
w: file:///home/expo/workingdir/build/node_modules/expo/android/src/main/java/expo/modules/fetch/ExpoFetchModule.kt:30:39 'constructor(reactContext: ReactContext): ForwardingCookieHandler' is deprecated. Use the default constructor.
w: file:///home/expo/workingdir/build/node_modules/expo/android/src/main/java/expo/modules/fetch/NativeResponse.kt:41:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Please add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/expo/workingdir/build/node_modules/expo/android/src/main/java/expo/modules/fetch/NativeResponse.kt:43:11 'fun deallocate(): Unit' is deprecated. Use sharedObjectDidRelease() instead.
> Task :react-native-worklets:configureCMakeRelWithDebInfo[arm64-v8a]
Checking the license for package CMake 3.22.1 in /home/expo/Android/Sdk/licenses
License for package CMake 3.22.1 accepted.
Preparing "Install CMake 3.22.1 v.3.22.1".
"Install CMake 3.22.1 v.3.22.1" ready.
Installing CMake 3.22.1 in /home/expo/Android/Sdk/cmake/3.22.1
"Install CMake 3.22.1 v.3.22.1" complete.
"Install CMake 3.22.1 v.3.22.1" finished.
> Task :expo:compileReleaseJavaWithJavac
> Task :expo:bundleLibCompileToJarRelease
> Task :expo:bundleLibRuntimeToJarRelease
> Task :expo:processReleaseJavaRes
> Task :expo:createFullJarRelease
> Task :react-native-safe-area-context:extractReleaseAnnotations
> Task :react-native-gesture-handler:extractReleaseAnnotations
> Task :react-native-gesture-handler:generateReleaseLintModel
> Task :react-native-gesture-handler:mergeReleaseGeneratedProguardFiles
> Task :react-native-gesture-handler:mergeReleaseConsumerProguardFiles
> Task :react-native-gesture-handler:mergeReleaseShaders
> Task :react-native-gesture-handler:compileReleaseShaders NO-SOURCE
> Task :react-native-gesture-handler:generateReleaseAssets UP-TO-DATE
> Task :react-native-gesture-handler:packageReleaseAssets
> Task :react-native-gesture-handler:prepareReleaseArtProfile
> Task :react-native-gesture-handler:mergeReleaseJavaResource
> Task :react-native-gesture-handler:syncReleaseLibJars
> Task :react-native-safe-area-context:mergeReleaseGeneratedProguardFiles
> Task :react-native-safe-area-context:mergeReleaseConsumerProguardFiles
> Task :react-native-safe-area-context:mergeReleaseShaders
> Task :react-native-safe-area-context:compileReleaseShaders NO-SOURCE
> Task :react-native-safe-area-context:generateReleaseAssets UP-TO-DATE
> Task :react-native-safe-area-context:packageReleaseAssets
> Task :react-native-safe-area-context:prepareReleaseArtProfile
> Task :app:compileReleaseKotlin FAILED
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionBridge.kt:201:49 Unresolved reference 'BackgroundActionService'.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionBridge.kt:201:80 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionBridge.kt:201:80 Unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
val <T> KClass<T>.java: Class<T>
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionBridge.kt:201:86 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionBridge.kt:201:86 Unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
fun <T> T.apply(block: T.() -> Unit): T
    [R|Contract description]
     <
        CallsInPlace(block, EXACTLY_ONCE)
    >
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionBridge.kt:201:92 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionBridge.kt:202:17 Unresolved reference 'putExtra'.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionBridge.kt:203:17 Unresolved reference 'putExtra'.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionBridge.kt:205:21 Unresolved reference 'putExtra'.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionBridge.kt:208:21 Unresolved reference 'putExtra'.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt:29:49 Unresolved reference 'BackgroundActionService'.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt:29:80 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt:29:80 Unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
val <T> KClass<T>.java: Class<T>
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt:29:86 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt:29:86 Unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
fun <T> T.apply(block: T.() -> Unit): T
    [R|Contract description]
     <
        CallsInPlace(block, EXACTLY_ONCE)
    >
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt:29:92 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt:30:17 Unresolved reference 'putExtra'.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt:31:17 Unresolved reference 'putExtra'.
e: file:///home/expo/workingdir/build/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt:32:17 Unresolved reference 'putExtra'.
> Task :react-native-safe-area-context:mergeReleaseJavaResource
> Task :react-native-safe-area-context:syncReleaseLibJars
> Task :expo:generateReleaseLintModel
> Task :react-native-worklets:configureCMakeRelWithDebInfo[armeabi-v7a]
[Incubating] Problems report is available at: file:///home/expo/workingdir/build/android/build/reports/problems/problems-report.html
Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.
You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.
For more on this, please refer to https://docs.gradle.org/8.13/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.
345 actionable tasks: 345 executed
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':app:compileReleaseKotlin'.
> A failure occurred while executing org.jetbrains.kotlin.compilerRunner.GradleCompilerRunnerWithWorkers$GradleKotlinCompilerWorkAction
   > Compilation error. See log for more details
* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.
BUILD FAILED in 3m 40s
Error: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.