package com.example.astroquiz;

import android.graphics.Color;
import android.os.Bundle;

import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

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
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        // 单页面刷题应用：按返回键直接退出应用，不回到上一题
        finish();
    }
}
