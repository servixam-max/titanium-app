package com.servixam.titanium;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.DownloadListener;
import android.content.pm.ApplicationInfo;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdatePlugin.class);
        registerPlugin(NativeTTSPlugin.class);
        super.onCreate(savedInstanceState);
        // Keep screen on while app is active (prevents screen lock during workout)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Depuración del WebView solo en builds de desarrollo: permite inspeccionar
        // la app con `adb forward` + Chrome DevTools (medir el layout de verdad).
        // En release queda apagado para no exponer la sesión del usuario.
        // Se mira el flag DEBUGGABLE del APK en vez de BuildConfig, que este
        // proyecto no genera.
        boolean esDepurable =
            (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (esDepurable) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // Allow autoplay of media without user gesture (fixes AudioContext + TTS in WebView)
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
            bridge.getWebView().setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW);
                        intent.setData(Uri.parse(url));
                        startActivity(intent);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }
    }
}
