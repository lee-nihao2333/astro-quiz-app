package com.example.astroquiz;

import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String VIBRATE_BRIDGE_NAME = "AstroNativeVibrate";
    private static final int MIN_VIBRATE_MS = 1;
    private static final int MAX_VIBRATE_MS = 1000;

    // 持有注入对象，避免被 GC 后 window.AstroNativeVibrate 变成无效引用。
    private VibrateBridge vibrateBridge;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Android 15+ 会强制全面屏（edge-to-edge），targetSdk 36 时无法关闭。
        // 按 Capacitor 8 官方 SystemBars 文档建议显式启用，并强制深色系统栏样式
        // （透明背景 + 浅色图标），再由网页里的 safe-area CSS 让内容避开系统栏。
        EdgeToEdge.enable(
            this,
            SystemBarStyle.dark(Color.TRANSPARENT),
            SystemBarStyle.dark(Color.TRANSPARENT)
        );
        super.onCreate(savedInstanceState);

        // bridge 在 super.onCreate 内创建；这里在页面 JS 执行前注入原生震动桥，
        // 让 app.js 的 vibrateOnce() 优先直接驱动 Android Vibrator。
        vibrateBridge = new VibrateBridge(getApplicationContext());
        if (getBridge() != null) {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                try {
                    webView.addJavascriptInterface(vibrateBridge, VIBRATE_BRIDGE_NAME);
                } catch (Exception ignored) {
                    // 注入失败时 app.js 会退回 navigator.vibrate，不影响答题。
                }
            }
        }
    }

    /** 只暴露一个 @JavascriptInterface 方法，供 app.js 的 vibrateOnce() 优先调用。 */
    public static final class VibrateBridge {

        private final Context context;

        VibrateBridge(Context context) {
            this.context = context;
        }

        @SuppressWarnings("deprecation")
        @JavascriptInterface
        public void vibrate(int ms) {
            // 限制在 1–1000ms：过滤 0 / 负数 / 异常大的值，避免无效参数静默失败。
            int duration = Math.max(MIN_VIBRATE_MS, Math.min(ms, MAX_VIBRATE_MS));
            try {
                Vibrator vibrator;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    VibratorManager manager =
                        (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                    vibrator = manager == null ? null : manager.getDefaultVibrator();
                } else {
                    vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                }
                if (vibrator == null || !vibrator.hasVibrator()) {
                    return;
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(
                        VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE)
                    );
                } else {
                    // API 24–25：VibrationEffect 尚不存在，退回废弃的 long 重载。
                    vibrator.vibrate(duration);
                }
            } catch (Exception ignored) {
                // 震动是锦上添花：权限 / 厂商策略 / 硬件异常都不能中断答题流程。
            }
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        // 单页面刷题应用：按返回键直接退出应用，不回到上一题
        finish();
    }
}
