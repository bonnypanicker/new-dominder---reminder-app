# Crashlytics - Stack trace
# Application: app.rork.dominder_android_reminder_app
# Platform: android
# Version: 1.0.0 (14)
# Issue: 96329ef79f708a282bf00cadaa139ff7
# Session: 6931A2AC012700016056696A958C0E54_DNE_0_v2
# Date: Thu Dec 04 2025 20:34:25 GMT+0530 (India Standard Time)

Fatal Exception: java.lang.RuntimeException: Crash Test
       at io.invertase.firebase.crashlytics.ReactNativeFirebaseCrashlyticsModule$1.run(ReactNativeFirebaseCrashlyticsModule.java:83)
       at android.os.Handler.handleCallback(Handler.java:938)
       at android.os.Handler.dispatchMessage(Handler.java:99)
       at android.os.Looper.loopOnce(Looper.java:226)
       at android.os.Looper.loop(Looper.java:313)
       at com.facebook.react.bridge.queue.MessageQueueThreadImpl$Companion.startNewBackgroundThread$lambda$1(MessageQueueThreadImpl.kt:175)
       at com.facebook.react.bridge.queue.MessageQueueThreadImpl$Companion.$r8$lambda$ldnZnqelhYFctGaUKkOKYj5rxo4()
       at com.facebook.react.bridge.queue.MessageQueueThreadImpl$Companion$$ExternalSyntheticLambda0.run(D8$$SyntheticClass)
       at java.lang.Thread.run(Thread.java:920)

DefaultDispatcher-worker-3:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:353)
       at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.park(CoroutineScheduler.kt:858)
       at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.tryPark(CoroutineScheduler.kt:806)
       at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:754)
       at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)

FinalizerDaemon:
       at java.lang.Object.wait(Object.java)
       at java.lang.Object.wait(Object.java:442)
       at java.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:190)
       at java.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:211)
       at java.lang.Daemons$FinalizerDaemon.runInternal(Daemons.java:273)
       at java.lang.Daemons$Daemon.run(Daemons.java:139)
       at java.lang.Thread.run(Thread.java:920)

WM.task-1:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.park(LockSupport.java:190)
       at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2067)
       at java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:442)
       at java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at java.lang.Thread.run(Thread.java:920)

DefaultDispatcher-worker-2:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:353)
       at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.park(CoroutineScheduler.kt:858)
       at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.tryPark(CoroutineScheduler.kt:806)
       at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:754)
       at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)

HybridData DestructorThread:
       at java.lang.Object.wait(Object.java)
       at java.lang.Object.wait(Object.java:442)
       at java.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:190)
       at java.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:211)
       at com.facebook.jni.DestructorThread$1.run(DestructorThread.java:77)

pool-8-thread-1:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.park(LockSupport.java:190)
       at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2067)
       at java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:442)
       at java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at java.lang.Thread.run(Thread.java:920)

ReferenceQueueDaemon:
       at java.lang.Object.wait(Object.java)
       at java.lang.Object.wait(Object.java:442)
       at java.lang.Object.wait(Object.java:568)
       at java.lang.Daemons$ReferenceQueueDaemon.runInternal(Daemons.java:217)
       at java.lang.Daemons$Daemon.run(Daemons.java:139)
       at java.lang.Thread.run(Thread.java:920)

Firebase Background Thread #1:
       at java.lang.Thread.nativeCreate(Thread.java)
       at java.lang.Thread.start(Thread.java:884)
       at java.util.concurrent.ThreadPoolExecutor.addWorker(ThreadPoolExecutor.java:975)
       at java.util.concurrent.ThreadPoolExecutor.execute(ThreadPoolExecutor.java:1393)
       at com.google.firebase.concurrent.DelegatingScheduledExecutorService.execute(DelegatingScheduledExecutorService.java:104)
       at kotlinx.coroutines.ExecutorCoroutineDispatcherImpl.dispatch(Executors.kt:130)
       at kotlinx.coroutines.internal.DispatchedContinuationKt.resumeCancellableWith(DispatchedContinuation.kt:302)
       at kotlinx.coroutines.intrinsics.CancellableKt.startCoroutineCancellable(Cancellable.kt:26)
       at kotlinx.coroutines.CoroutineStart.invoke(CoroutineStart.kt:358)
       at kotlinx.coroutines.AbstractCoroutine.start(AbstractCoroutine.kt:124)
       at kotlinx.coroutines.BuildersKt__Builders_commonKt.launch(Builders.common.kt:52)
       at kotlinx.coroutines.BuildersKt.launch(:1)
       at kotlinx.coroutines.BuildersKt__Builders_commonKt.launch$default(Builders.common.kt:43)
       at kotlinx.coroutines.BuildersKt.launch$default(:1)
       at androidx.datastore.core.SimpleActor.offer(SimpleActor.kt:111)
       at androidx.datastore.core.DataStoreImpl$updateData$2.invokeSuspend(DataStoreImpl.kt:168)
       at androidx.datastore.core.DataStoreImpl$updateData$2.invoke(:8)
       at androidx.datastore.core.DataStoreImpl$updateData$2.invoke(:4)
       at kotlinx.coroutines.intrinsics.UndispatchedKt.startUndispatchedOrReturn(Undispatched.kt:42)
       at kotlinx.coroutines.BuildersKt__Builders_commonKt.withContext(Builders.common.kt:164)
       at kotlinx.coroutines.BuildersKt.withContext(:1)
       at androidx.datastore.core.DataStoreImpl.updateData(DataStoreImpl.kt:163)
       at com.google.firebase.sessions.SharedSessionRepositoryImpl$appBackground$1.invokeSuspend(SharedSessionRepository.kt:112)
       at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
       at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1167)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at com.google.firebase.concurrent.CustomThreadFactory.lambda$newThread$0$com-google-firebase-concurrent-CustomThreadFactory(CustomThreadFactory.java:47)
       at com.google.firebase.concurrent.CustomThreadFactory$$ExternalSyntheticLambda0.run(D8$$SyntheticClass)
       at java.lang.Thread.run(Thread.java:920)

expo.modules.AsyncFunctionQueue:
       at android.os.MessageQueue.nativePollOnce(MessageQueue.java)
       at android.os.MessageQueue.next(MessageQueue.java:335)
       at android.os.Looper.loopOnce(Looper.java:186)
       at android.os.Looper.loop(Looper.java:313)
       at android.os.HandlerThread.run(HandlerThread.java:67)

mqt_v_js:
       at android.os.MessageQueue.nativePollOnce(MessageQueue.java)
       at android.os.MessageQueue.next(MessageQueue.java:335)
       at android.os.Looper.loopOnce(Looper.java:186)
       at android.os.Looper.loop(Looper.java:313)
       at com.facebook.react.bridge.queue.MessageQueueThreadImpl$Companion.startNewBackgroundThread$lambda$1(MessageQueueThreadImpl.kt:175)
       at com.facebook.react.bridge.queue.MessageQueueThreadImpl$Companion.$r8$lambda$ldnZnqelhYFctGaUKkOKYj5rxo4()
       at com.facebook.react.bridge.queue.MessageQueueThreadImpl$Companion$$ExternalSyntheticLambda0.run(D8$$SyntheticClass)
       at java.lang.Thread.run(Thread.java:920)

pool-4-thread-1:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.park(LockSupport.java:190)
       at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2067)
       at java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:442)
       at java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at java.lang.Thread.run(Thread.java:920)

Firebase Blocking Thread #3:
       at java.lang.Thread.run(Thread.java:919)

Firebase Background Thread #2:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.park(LockSupport.java:190)
       at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2067)
       at java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:442)
       at java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at com.google.firebase.concurrent.CustomThreadFactory.lambda$newThread$0$com-google-firebase-concurrent-CustomThreadFactory(CustomThreadFactory.java:47)
       at com.google.firebase.concurrent.CustomThreadFactory$$ExternalSyntheticLambda0.run(D8$$SyntheticClass)
       at java.lang.Thread.run(Thread.java:920)

arch_disk_io_0:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.park(LockSupport.java:190)
       at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2067)
       at java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:442)
       at java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at java.lang.Thread.run(Thread.java:920)

Expo JNI deallocator:
       at java.lang.Object.wait(Object.java)
       at java.lang.Object.wait(Object.java:442)
       at java.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:190)
       at java.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:211)
       at expo.modules.kotlin.jni.JNIDeallocator$destructorThread$1.run(JNIDeallocator.kt:36)

queued-work-looper:
       at android.os.MessageQueue.nativePollOnce(MessageQueue.java)
       at android.os.MessageQueue.next(MessageQueue.java:335)
       at android.os.Looper.loopOnce(Looper.java:186)
       at android.os.Looper.loop(Looper.java:313)
       at android.os.HandlerThread.run(HandlerThread.java:67)

queued-work-looper-data:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.park(LockSupport.java:190)
       at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2067)
       at java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:442)
       at java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at java.lang.Thread.run(Thread.java:920)

main:
       at android.os.MessageQueue.nativePollOnce(MessageQueue.java)
       at android.os.MessageQueue.next(MessageQueue.java:335)
       at android.os.Looper.loopOnce(Looper.java:186)
       at android.os.Looper.loop(Looper.java:313)
       at android.app.ActivityThread.main(ActivityThread.java:8633)
       at java.lang.reflect.Method.invoke(Method.java)
       at com.android.internal.os.RuntimeInit$MethodAndArgsCaller.run(RuntimeInit.java:567)
       at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:1133)

Firebase Background Thread #0:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.park(LockSupport.java:190)
       at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2067)
       at java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:442)
       at java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at com.google.firebase.concurrent.CustomThreadFactory.lambda$newThread$0$com-google-firebase-concurrent-CustomThreadFactory(CustomThreadFactory.java:47)
       at com.google.firebase.concurrent.CustomThreadFactory$$ExternalSyntheticLambda0.run(D8$$SyntheticClass)
       at java.lang.Thread.run(Thread.java:920)

DefaultDispatcher-worker-1:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:353)
       at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.park(CoroutineScheduler.kt:858)
       at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.tryPark(CoroutineScheduler.kt:806)
       at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:754)
       at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)

FinalizerWatchdogDaemon:
       at java.lang.Thread.sleep(Thread.java)
       at java.lang.Thread.sleep(Thread.java:451)
       at java.lang.Thread.sleep(Thread.java:356)
       at java.lang.Daemons$FinalizerWatchdogDaemon.sleepForNanos(Daemons.java:390)
       at java.lang.Daemons$FinalizerWatchdogDaemon.waitForFinalization(Daemons.java:419)
       at java.lang.Daemons$FinalizerWatchdogDaemon.runInternal(Daemons.java:325)
       at java.lang.Daemons$Daemon.run(Daemons.java:139)
       at java.lang.Thread.run(Thread.java:920)

Okio Watchdog:
       at java.lang.Object.wait(Object.java)
       at java.lang.Object.wait(Object.java:442)
       at java.lang.Object.wait(Object.java:568)
       at com.android.okhttp.okio.AsyncTimeout.awaitTimeout(AsyncTimeout.java:313)
       at com.android.okhttp.okio.AsyncTimeout.access$000(AsyncTimeout.java:42)
       at com.android.okhttp.okio.AsyncTimeout$Watchdog.run(AsyncTimeout.java:288)

FileObserver:
       at android.os.FileObserver$ObserverThread.observe(FileObserver.java)
       at android.os.FileObserver$ObserverThread.run(FileObserver.java:116)

queued-work-looper-data:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.park(LockSupport.java:190)
       at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2067)
       at java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:442)
       at java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at java.lang.Thread.run(Thread.java:920)

AsyncTask #1:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.park(LockSupport.java:190)
       at java.util.concurrent.SynchronousQueue$TransferStack.awaitFulfill(SynchronousQueue.java:459)
       at java.util.concurrent.SynchronousQueue$TransferStack.transfer(SynchronousQueue.java:362)
       at java.util.concurrent.SynchronousQueue.take(SynchronousQueue.java:920)
       at java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at java.lang.Thread.run(Thread.java:920)

WM.task-2:
       at sun.misc.Unsafe.park(Unsafe.java)
       at java.util.concurrent.locks.LockSupport.park(LockSupport.java:190)
       at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2067)
       at java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:442)
       at java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at java.lang.Thread.run(Thread.java:920)

OkHttp ConnectionPool:
       at java.lang.Object.wait(Object.java)
       at com.android.okhttp.ConnectionPool$1.run(ConnectionPool.java:106)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1167)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at java.lang.Thread.run(Thread.java:920)

Firebase Background Thread #3:
       at dalvik.system.VMStack.getThreadStackTrace(VMStack.java)
       at java.lang.Thread.getStackTrace(Thread.java:1724)
       at java.lang.Thread.getAllStackTraces(Thread.java:1800)
       at com.google.firebase.crashlytics.internal.common.CrashlyticsReportDataCapture.populateThreadsList(CrashlyticsReportDataCapture.java:343)
       at com.google.firebase.crashlytics.internal.common.CrashlyticsReportDataCapture.populateExecutionData(CrashlyticsReportDataCapture.java:314)
       at com.google.firebase.crashlytics.internal.common.CrashlyticsReportDataCapture.populateEventApplicationData(CrashlyticsReportDataCapture.java:261)
       at com.google.firebase.crashlytics.internal.common.CrashlyticsReportDataCapture.captureEventData(CrashlyticsReportDataCapture.java:112)
       at com.google.firebase.crashlytics.internal.common.SessionReportingCoordinator.persistEvent(SessionReportingCoordinator.java:337)
       at com.google.firebase.crashlytics.internal.common.SessionReportingCoordinator.persistFatalEvent(SessionReportingCoordinator.java:130)
       at com.google.firebase.crashlytics.internal.common.CrashlyticsController$2.call(CrashlyticsController.java:218)
       at com.google.firebase.crashlytics.internal.common.CrashlyticsController$2.call(CrashlyticsController.java:204)
       at com.google.firebase.crashlytics.internal.concurrency.CrashlyticsWorker.lambda$submitTask$2(CrashlyticsWorker.java:118)
       at com.google.firebase.crashlytics.internal.concurrency.CrashlyticsWorker$$ExternalSyntheticLambda3.then(D8$$SyntheticClass)
       at com.google.android.gms.tasks.zze.run(com.google.android.gms:play-services-tasks@@18.1.0:1)
       at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1167)
       at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
       at com.google.firebase.concurrent.CustomThreadFactory.lambda$newThread$0$com-google-firebase-concurrent-CustomThreadFactory(CustomThreadFactory.java:47)
       at com.google.firebase.concurrent.CustomThreadFactory$$ExternalSyntheticLambda0.run(D8$$SyntheticClass)
       at java.lang.Thread.run(Thread.java:920)