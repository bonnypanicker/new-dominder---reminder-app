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
> Task :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :gradle-plugin:shared:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:checkKotlinGradlePluginConfigurationErrors
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:pluginDescriptors
> Task :gradle-plugin:settings-plugin:pluginDescriptors
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:processResources
> Task :gradle-plugin:settings-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:processResources NO-SOURCE
> Task :gradle-plugin:shared:processResources NO-SOURCE
> Task :gradle-plugin:shared:compileKotlin
> Task :gradle-plugin:shared:compileJava NO-SOURCE
> Task :gradle-plugin:shared:classes
UP-TO-DATE
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
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:compileJava NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:classes
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:jar
> Task :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-gradle-plugin:expo-autolinking-plugin:checkKotlinGradlePluginConfigurationErrors
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
> Configure project :expo
Using expo modules
  - [32mexpo-constants[0m (17.1.7)
  - [32mexpo-image-loader[0m (5.1.0)
> Configure project :expo-modules-core
Checking the license for package NDK (Side by side) 27.1.12297006 in /home/expo/Android/Sdk/licenses
License for package NDK (Side by side) 27.1.12297006 accepted.
Preparing "Install NDK (Side by side) 27.1.12297006 v.27.1.12297006".
"Install NDK (Side by side) 27.1.12297006 v.27.1.12297006" ready.
Installing NDK (Side by side) 27.1.12297006 in /home/expo/Android/Sdk/ndk/27.1.12297006
"Install NDK (Side by side) 27.1.12297006 v.27.1.12297006" complete.
"Install NDK (Side by side) 27.1.12297006 v.27.1.12297006" finished.
> Configure project :expo
  - [32mexpo-modules-core[0m (2.5.0)
- [33m[📦][0m [32mexpo-asset[0m (11.1.7)
  - [33m[📦][0m [32mexpo-audio[0m (0.4.9)
  - [33m[📦][0m [32mexpo-blur[0m (14.1.5)
  - [33m[📦][0m [32mexpo-document-picker[0m (13.1.6)
- [33m[📦][0m [32mexpo-file-system[0m (18.1.11)
  - [33m[📦][0m [32mexpo-font[0m (13.3.2)
  - [33m[📦][0m [32mexpo-haptics[0m (14.1.4)
  - [33m[📦][0m [32mexpo-image[0m (2.4.1)
  - [33m[📦][0m [32mexpo-image-picker[0m (16.1.4)
  - [33m[📦][0m [32mexpo-keep-awake[0m (14.1.4)
  - [33m[📦][0m [32mexpo-linear-gradient[0m (14.1.5)
- [33m[📦][0m [32mexpo-linking[0m (7.1.7)
  - [33m[📦][0m [32mexpo-location[0m (18.1.6)
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
> Configure project :react-native-reanimated
Android gradle plugin: 8.8.2
Gradle: 8.13
> Task :expo-modules-core:preBuild UP-TO-DATE
> Task :react-native-gesture-handler:preBuild UP-TO-DATE
> Task :notifee_react-native:preBuild UP-TO-DATE
> Task :react-native-async-storage_async-storage:preBuild UP-TO-DATE
> Task :notifee_react-native:preReleaseBuild UP-TO-DATE
> Task :expo-modules-core:preReleaseBuild UP-TO-DATE
> Task :expo-image-loader:preBuild
UP-TO-DATE
> Task :expo-image-loader:preReleaseBuild UP-TO-DATE
> Task :react-native-async-storage_async-storage:preReleaseBuild UP-TO-DATE
> Task :react-native-gesture-handler:preReleaseBuild UP-TO-DATE
> Task :react-native-gesture-handler:writeReleaseAarMetadata
> Task :expo-modules-core:writeReleaseAarMetadata
> Task :notifee_react-native:writeReleaseAarMetadata
> Task :react-native-async-storage_async-storage:writeReleaseAarMetadata
> Task :expo-image-loader:writeReleaseAarMetadata
> Task :react-native-safe-area-context:preBuild UP-TO-DATE
> Task :react-native-screens:preBuild UP-TO-DATE
> Task :react-native-screens:preReleaseBuild UP-TO-DATE
> Task :react-native-ringtone-manager-new:preBuild UP-TO-DATE
> Task :react-native-ringtone-manager-new:preReleaseBuild UP-TO-DATE
> Task :react-native-reanimated:assertMinimalReactNativeVersionTask SKIPPED
> Task :react-native-svg:preBuild UP-TO-DATE
> Task :react-native-svg:preReleaseBuild UP-TO-DATE
> Task :react-native-safe-area-context:preReleaseBuild UP-TO-DATE
> Task :react-native-safe-area-context:writeReleaseAarMetadata
> Task :react-native-svg:writeReleaseAarMetadata
> Task :expo-image-loader:generateReleaseResValues
> Task :react-native-ringtone-manager-new:writeReleaseAarMetadata
> Task :react-native-screens:writeReleaseAarMetadata
> Task :notifee_react-native:generateReleaseResValues
> Task :react-native-async-storage_async-storage:generateReleaseResValues
> Task :expo-image-loader:generateReleaseResources
> Task :expo-modules-core:generateReleaseResValues
> Task :notifee_react-native:generateReleaseResources
> Task :react-native-async-storage_async-storage:generateReleaseResources
> Task :react-native-reanimated:prepareReanimatedHeadersForPrefabs
> Task :app:buildKotlinToolingMetadata
> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-modules-core:generateReleaseResources
> Task :react-native-reanimated:prepareWorkletsHeadersForPrefabs
> Task :react-native-reanimated:preBuild
> Task :react-native-reanimated:preReleaseBuild
> Task :app:generateAutolinkingPackageList
> Task :react-native-reanimated:writeReleaseAarMetadata
> Task :app:generateCodegenSchemaFromJavaScript SKIPPED
> Task :app:generateCodegenArtifactsFromSchema SKIPPED
> Task :app:preBuild
> Task :app:preReleaseBuild
> Task :react-native-gesture-handler:generateReleaseResValues
> Task :react-native-gesture-handler:generateReleaseResources
> Task :app:generateReleaseBuildConfig
> Task :react-native-async-storage_async-storage:packageReleaseResources
> Task :expo-modules-core:packageReleaseResources
> Task :react-native-reanimated:generateReleaseResValues
> Task :notifee_react-native:packageReleaseResources
> Task :expo-image-loader:packageReleaseResources
> Task :react-native-screens:generateReleaseResValues
> Task :react-native-ringtone-manager-new:generateReleaseResValues
> Task :react-native-safe-area-context:generateReleaseResValues
> Task :react-native-reanimated:generateReleaseResources
> Task :react-native-safe-area-context:generateReleaseResources
> Task :react-native-ringtone-manager-new:generateReleaseResources
> Task :react-native-screens:generateReleaseResources
> Task :react-native-reanimated:packageReleaseResources
> Task :react-native-gesture-handler:packageReleaseResources
> Task :react-native-svg:generateReleaseResValues
> Task :expo-image-loader:extractDeepLinksRelease
> Task :react-native-ringtone-manager-new:packageReleaseResources
> Task :react-native-safe-area-context:packageReleaseResources
> Task :react-native-svg:generateReleaseResources
> Task :expo-modules-core:extractDeepLinksRelease
> Task :notifee_react-native:extractDeepLinksRelease
> Task :react-native-svg:packageReleaseResources
> Task :react-native-async-storage_async-storage:extractDeepLinksRelease
> Task :react-native-screens:packageReleaseResources
> Task :react-native-gesture-handler:extractDeepLinksRelease
> Task :expo-modules-core:processReleaseManifest
/home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/AndroidManifest.xml:8:9-11:45 Warning:
	meta-data#com.facebook.soloader.enabled@android:value was tagged at AndroidManifest.xml:8 to replace other declarations but no other declaration present
> Task :notifee_react-native:processReleaseManifest
package="io.invertase.notifee" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@notifee/react-native/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="io.invertase.notifee" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@notifee/react-native/android/src/main/AndroidManifest.xml.
> Task :expo-constants:createExpoConfig
> Task :expo-constants:preBuild
> Task :expo-image-loader:processReleaseManifest
> Task :react-native-async-storage_async-storage:processReleaseManifest
package="com.reactnativecommunity.asyncstorage" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.reactnativecommunity.asyncstorage" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
> Task :react-native-gesture-handler:processReleaseManifest
> Task :expo-constants:preReleaseBuild
> Task :react-native-ringtone-manager-new:extractDeepLinksRelease
The NODE_ENV environment variable is required but was not specified. Ensure the project is bundled with Expo CLI or NODE_ENV is set. Using only .env.local and .env
> Task :react-native-svg:extractDeepLinksRelease
> Task :react-native-reanimated:extractDeepLinksRelease
> Task :react-native-screens:extractDeepLinksRelease
> Task :react-native-safe-area-context:extractDeepLinksRelease
> Task :expo-constants:writeReleaseAarMetadata
> Task :expo-constants:generateReleaseResValues
> Task :expo-constants:generateReleaseResources
> Task :react-native-screens:processReleaseManifest
> Task :react-native-ringtone-manager-new:processReleaseManifest
package="com.ringtonemanager" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-ringtone-manager-new/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.ringtonemanager" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-ringtone-manager-new/android/src/main/AndroidManifest.xml.
> Task :react-native-svg:processReleaseManifest
> Task :react-native-safe-area-context:processReleaseManifest
package="com.th3rdwave.safeareacontext" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.th3rdwave.safeareacontext" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
> Task :expo-constants:packageReleaseResources
> Task :react-native-reanimated:processReleaseManifest
> Task :expo-constants:extractDeepLinksRelease
> Task :expo-constants:processReleaseManifest
> Task :expo:generatePackagesList
> Task :expo:preBuild
> Task :expo:preReleaseBuild
> Task :expo:writeReleaseAarMetadata
> Task :expo:generateReleaseResValues
> Task :expo:generateReleaseResources
> Task :expo:packageReleaseResources
> Task :expo:extractDeepLinksRelease
> Task :expo:processReleaseManifest
> Task :expo-constants:compileReleaseLibraryResources
> Task :react-native-gesture-handler:compileReleaseLibraryResources
> Task :react-native-async-storage_async-storage:compileReleaseLibraryResources
> Task :expo-modules-core:compileReleaseLibraryResources
> Task :notifee_react-native:compileReleaseLibraryResources
> Task :expo-image-loader:compileReleaseLibraryResources
> Task :expo:compileReleaseLibraryResources
> Task :expo-modules-core:parseReleaseLocalResources
> Task :react-native-gesture-handler:parseReleaseLocalResources
> Task :expo:parseReleaseLocalResources
> Task :expo-constants:parseReleaseLocalResources
> Task :react-native-async-storage_async-storage:parseReleaseLocalResources
> Task :expo-image-loader:parseReleaseLocalResources
> Task :notifee_react-native:parseReleaseLocalResources
> Task :react-native-async-storage_async-storage:generateReleaseRFile
> Task :expo-modules-core:generateReleaseRFile
> Task :expo-image-loader:generateReleaseRFile
> Task :react-native-gesture-handler:generateReleaseRFile
> Task :notifee_react-native:generateReleaseRFile
> Task :expo:generateReleaseRFile
> Task :expo-constants:generateReleaseRFile
> Task :expo-constants:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo:generateReleaseBuildConfig
> Task :expo-constants:generateReleaseBuildConfig
> Task :react-native-ringtone-manager-new:compileReleaseLibraryResources
> Task :react-native-reanimated:compileReleaseLibraryResources
> Task :react-native-svg:compileReleaseLibraryResources
> Task :react-native-safe-area-context:compileReleaseLibraryResources
> Task :expo-modules-core:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-ringtone-manager-new:parseReleaseLocalResources
> Task :react-native-safe-area-context:parseReleaseLocalResources
> Task :expo-modules-core:generateReleaseBuildConfig
> Task :react-native-ringtone-manager-new:generateReleaseRFile
> Task :react-native-reanimated:parseReleaseLocalResources
> Task :react-native-svg:parseReleaseLocalResources
> Task :react-native-safe-area-context:generateReleaseRFile
> Task :expo-image-loader:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-image-loader:generateReleaseBuildConfig
> Task :react-native-reanimated:generateReleaseRFile
> Task :expo-image-loader:javaPreCompileRelease
> Task :react-native-screens:parseReleaseLocalResources
> Task :expo:javaPreCompileRelease
> Task :notifee_react-native:generateReleaseBuildConfig
> Task :expo-constants:javaPreCompileRelease
> Task :react-native-svg:generateReleaseRFile
> Task :react-native-gesture-handler:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-screens:compileReleaseLibraryResources
> Task :notifee_react-native:javaPreCompileRelease
> Task :react-native-reanimated:generateReleaseBuildConfig
> Task :react-native-async-storage_async-storage:generateReleaseBuildConfig
> Task :react-native-gesture-handler:generateReleaseBuildConfig
> Task :react-native-ringtone-manager-new:generateReleaseBuildConfig
> Task :react-native-ringtone-manager-new:javaPreCompileRelease
> Task :react-native-screens:generateReleaseRFile
> Task :react-native-safe-area-context:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-gesture-handler:javaPreCompileRelease
> Task :react-native-reanimated:javaPreCompileRelease
> Task :react-native-screens:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-reanimated:packageNdkLibs NO-SOURCE
> Task :react-native-async-storage_async-storage:javaPreCompileRelease
> Task :react-native-safe-area-context:generateReleaseBuildConfig
> Task :react-native-screens:generateReleaseBuildConfig
> Task :app:createBundleReleaseJsAndAssets
Starting Metro Bundler
Android ./index.js ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░ 87.6% (2601/2779)
Android Bundled 2553ms index.js (3136 modules)
Writing bundle output to: /home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle
Writing sourcemap output to: /home/expo/workingdir/build/android/app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map
Copying 45 asset files
Done writing bundle output
Done writing sourcemap output
> Task :react-native-safe-area-context:compileReleaseKotlin
w: file:///home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/java/com/th3rdwave/safeareacontext/SafeAreaView.kt:59:23 'val uiImplementation: UIImplementation!' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/paper/java/com/th3rdwave/safeareacontext/InsetsChangeEvent.kt:19:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Please add the '@Deprecated' annotation or suppress the diagnostic.
> Task :notifee_react-native:compileReleaseJavaWithJavac
/home/expo/workingdir/build/node_modules/@notifee/react-native/android/src/main/java/io/invertase/notifee/NotifeeApiModule.java:42: warning: [removal] onCatalystInstanceDestroy() in NativeModule has been deprecated and marked for removal
  public void onCatalystInstanceDestroy() {
              ^
Note: /home/expo/workingdir/build/node_modules/@notifee/react-native/android/src/main/java/io/invertase/notifee/NotifeeReactUtils.java uses or overrides a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
1 warning
> Task :react-native-async-storage_async-storage:compileReleaseJavaWithJavac
> Task :expo-modules-core:javaPreCompileRelease
> Task :react-native-safe-area-context:javaPreCompileRelease
> Task :react-native-ringtone-manager-new:compileReleaseJavaWithJavac
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/javaPackage/java/com/reactnativecommunity/asyncstorage/AsyncStoragePackage.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
Note: /home/expo/workingdir/build/node_modules/react-native-ringtone-manager-new/android/src/main/java/com/ringtonemanager/RingtoneManagerModule.java uses or overrides a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
> Task :react-native-reanimated:compileReleaseJavaWithJavac
> Task :react-native-async-storage_async-storage:bundleLibCompileToJarRelease
> Task :react-native-ringtone-manager-new:bundleLibCompileToJarRelease
> Task :react-native-reanimated:bundleLibCompileToJarRelease
> Task :react-native-screens:javaPreCompileRelease
> Task :react-native-svg:generateReleaseBuildConfig
> Task :expo:extractProguardFiles
> Task :react-native-svg:javaPreCompileRelease
> Task :expo-constants:extractProguardFiles
> Task :expo-modules-core:extractProguardFiles
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: Some input files use unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :expo-modules-core:prepareLintJarForPublish
> Task :expo-constants:prepareLintJarForPublish
> Task :expo-image-loader:extractProguardFiles
> Task :expo-image-loader:prepareLintJarForPublish
> Task :expo:prepareLintJarForPublish
> Task :react-native-async-storage_async-storage:bundleLibRuntimeToJarRelease
> Task :react-native-async-storage_async-storage:processReleaseJavaRes NO-SOURCE
> Task :react-native-async-storage_async-storage:createFullJarRelease
> Task :react-native-async-storage_async-storage:extractProguardFiles
> Task :react-native-safe-area-context:compileReleaseJavaWithJavac
> Task :react-native-safe-area-context:bundleLibCompileToJarRelease
> Task :react-native-gesture-handler:extractProguardFiles
> Task :react-native-reanimated:bundleLibRuntimeToJarRelease
> Task :react-native-reanimated:processReleaseJavaRes NO-SOURCE
> Task :react-native-reanimated:createFullJarRelease
> Task :react-native-reanimated:extractProguardFiles
Note: /home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/paper/java/com/th3rdwave/safeareacontext/NativeSafeAreaContextSpec.java uses or overrides a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
> Task :notifee_react-native:bundleLibCompileToJarRelease
> Task :notifee_react-native:bundleLibRuntimeToJarRelease
> Task :notifee_react-native:processReleaseJavaRes NO-SOURCE
> Task :notifee_react-native:createFullJarRelease
> Task :notifee_react-native:extractProguardFiles
> Task :react-native-svg:compileReleaseJavaWithJavac
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: Some input files use unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :react-native-svg:bundleLibCompileToJarRelease
> Task :react-native-gesture-handler:prepareLintJarForPublish
> Task :react-native-ringtone-manager-new:bundleLibRuntimeToJarRelease
> Task :react-native-ringtone-manager-new:processReleaseJavaRes NO-SOURCE
> Task :react-native-ringtone-manager-new:createFullJarRelease
> Task :react-native-ringtone-manager-new:extractProguardFiles
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
> Task :react-native-gesture-handler:compileReleaseKotlin
> Task :react-native-screens:compileReleaseJavaWithJavac
> Task :react-native-screens:bundleLibCompileToJarRelease
> Task :react-native-safe-area-context:bundleLibRuntimeToJarRelease
> Task :react-native-safe-area-context:processReleaseJavaRes
> Task :react-native-safe-area-context:createFullJarRelease
> Task :react-native-safe-area-context:extractProguardFiles
> Task :react-native-gesture-handler:compileReleaseJavaWithJavac
> Task :react-native-gesture-handler:bundleLibCompileToJarRelease
> Task :react-native-gesture-handler:bundleLibRuntimeToJarRelease
> Task :react-native-gesture-handler:processReleaseJavaRes
> Task :react-native-gesture-handler:createFullJarRelease
Note: /home/expo/workingdir/build/node_modules/react-native-gesture-handler/android/paper/src/main/java/com/swmansion/gesturehandler/NativeRNGestureHandlerModuleSpec.java uses or overrides a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
> Task :react-native-screens:bundleLibRuntimeToJarRelease
> Task :react-native-screens:processReleaseJavaRes
> Task :react-native-screens:createFullJarRelease
> Task :react-native-screens:extractProguardFiles
> Task :app:checkReleaseAarMetadata
> Task :app:generateReleaseResValues
> Task :app:mapReleaseSourceSetPaths
> Task :app:generateReleaseResources
> Task :expo-modules-core:compileReleaseKotlin
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/apploader/AppLoaderProvider.kt:34:52 Unchecked cast of 'java.lang.Class<*>!' to 'java.lang.Class<out expo.modules.apploader.HeadlessAppLoader>'.
> Task :react-native-ringtone-manager-new:generateReleaseLintModel
> Task :react-native-reanimated:generateReleaseLintModel
> Task :react-native-async-storage_async-storage:generateReleaseLintModel
> Task :react-native-safe-area-context:generateReleaseLintModel
> Task :react-native-screens:generateReleaseLintModel
> Task :notifee_react-native:generateReleaseLintModel
> Task :react-native-ringtone-manager-new:prepareLintJarForPublish
> Task :react-native-screens:prepareLintJarForPublish
> Task :notifee_react-native:prepareLintJarForPublish
> Task :react-native-safe-area-context:prepareLintJarForPublish
> Task :react-native-async-storage_async-storage:prepareLintJarForPublish
> Task :react-native-reanimated:prepareLintJarForPublish
> Task :react-native-svg:processReleaseJavaRes NO-SOURCE
> Task :react-native-svg:extractProguardFiles
> Task :react-native-svg:bundleLibRuntimeToJarRelease
> Task :react-native-gesture-handler:mergeReleaseJniLibFolders
> Task :react-native-safe-area-context:mergeReleaseJniLibFolders
> Task :react-native-async-storage_async-storage:mergeReleaseJniLibFolders
> Task :react-native-async-storage_async-storage:mergeReleaseNativeLibs NO-SOURCE
> Task :notifee_react-native:mergeReleaseJniLibFolders
> Task :react-native-safe-area-context:mergeReleaseNativeLibs NO-SOURCE
> Task :react-native-async-storage_async-storage:stripReleaseDebugSymbols NO-SOURCE
> Task :react-native-safe-area-context:stripReleaseDebugSymbols NO-SOURCE
> Task :notifee_react-native:mergeReleaseNativeLibs NO-SOURCE
> Task :notifee_react-native:stripReleaseDebugSymbols NO-SOURCE
> Task :react-native-safe-area-context:extractDeepLinksForAarRelease
> Task :react-native-safe-area-context:copyReleaseJniLibsProjectAndLocalJars
> Task :react-native-async-storage_async-storage:copyReleaseJniLibsProjectAndLocalJars
> Task :notifee_react-native:copyReleaseJniLibsProjectAndLocalJars
> Task :react-native-async-storage_async-storage:extractDeepLinksForAarRelease
> Task :notifee_react-native:extractDeepLinksForAarRelease
> Task :react-native-svg:generateReleaseLintModel
> Task :react-native-svg:createFullJarRelease
> Task :react-native-gesture-handler:generateReleaseLintModel
> Task :react-native-gesture-handler:mergeReleaseNativeLibs NO-SOURCE
> Task :react-native-gesture-handler:stripReleaseDebugSymbols NO-SOURCE
> Task :react-native-gesture-handler:copyReleaseJniLibsProjectAndLocalJars
> Task :react-native-gesture-handler:extractDeepLinksForAarRelease
> Task :react-native-svg:prepareLintJarForPublish
> Task :expo:mergeReleaseJniLibFolders
> Task :expo:mergeReleaseNativeLibs NO-SOURCE
> Task :expo:stripReleaseDebugSymbols NO-SOURCE
> Task :expo:copyReleaseJniLibsProjectAndLocalJars
> Task :expo:extractDeepLinksForAarRelease
> Task :expo:mergeReleaseShaders
> Task :expo:compileReleaseShaders NO-SOURCE
> Task :expo:generateReleaseAssets UP-TO-DATE
> Task :expo:packageReleaseAssets
> Task :expo:prepareReleaseArtProfile
> Task :expo-modules-core:compileReleaseJavaWithJavac
> Task :app:packageReleaseResources
> Task :app:parseReleaseLocalResources
> Task :app:createReleaseCompatibleScreenManifests
> Task :app:extractDeepLinksRelease
> Task :react-native-screens:configureCMakeRelWithDebInfo[arm64-v8a]
Checking the license for package CMake 3.22.1 in /home/expo/Android/Sdk/licenses
License for package CMake 3.22.1 accepted.
Preparing "Install CMake 3.22.1 v.3.22.1".
"Install CMake 3.22.1 v.3.22.1" ready.
Installing CMake 3.22.1 in /home/expo/Android/Sdk/cmake/3.22.1
"Install CMake 3.22.1 v.3.22.1" complete.
"Install CMake 3.22.1 v.3.22.1" finished.
> Task :app:mergeReleaseResources FAILED
> Task :app:processReleaseMainManifest
/home/expo/workingdir/build/android/app/src/main/AndroidManifest.xml Warning:
	provider#expo.modules.filesystem.FileSystemFileProvider@android:authorities was tagged at AndroidManifest.xml:0 to replace other declarations but no other declaration present
> Task :react-native-reanimated:configureCMakeRelWithDebInfo[arm64-v8a]
> Task :react-native-safe-area-context:extractReleaseAnnotations
> Task :notifee_react-native:extractReleaseAnnotations
> Task :react-native-async-storage_async-storage:extractReleaseAnnotations
> Task :react-native-gesture-handler:extractReleaseAnnotations
[Incubating] Problems report is available at: file:///home/expo/workingdir/build/android/build/reports/problems/problems-report.html
Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.
You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.
For more on this, please refer to https://docs.gradle.org/8.13/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.
274 actionable tasks: 274 executed
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':app:mergeReleaseResources'.
> A failure occurred while executing com.android.build.gradle.internal.res.Aapt2CompileRunnable
   > Android resource compilation failed
     ERROR: /home/expo/workingdir/build/android/app/src/main/res/drawable/small_icon_noti.png: AAPT: error: file failed to compile.
         
* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.
BUILD FAILED in 2m 37s
Error: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.