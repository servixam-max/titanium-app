package com.servixam.titanium;

import android.media.AudioAttributes;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

@CapacitorPlugin(name = "NativeTTS")
public class NativeTTSPlugin extends Plugin implements TextToSpeech.OnInitListener {
    private TextToSpeech tts;
    private boolean isInitialized = false;

    @Override
    public void load() {
        super.load();
        initTTS();
    }

    private synchronized void initTTS() {
        if (tts != null) return;
        try {
            tts = new TextToSpeech(getContext(), this);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS && tts != null) {
            try {
                // Set Spanish locale
                Locale spanishLocale = new Locale("es", "ES");
                int result = tts.setLanguage(spanishLocale);
                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.setLanguage(new Locale("es"));
                }

                // Configure AudioAttributes for speech assistance (allows auto-ducking of background music)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    AudioAttributes attributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build();
                    tts.setAudioAttributes(attributes);
                }

                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {
                        JSObject data = new JSObject();
                        data.put("id", utteranceId);
                        notifyListeners("speechStart", data);
                    }

                    @Override
                    public void onDone(String utteranceId) {
                        JSObject data = new JSObject();
                        data.put("id", utteranceId);
                        notifyListeners("speechDone", data);
                    }

                    @Override
                    public void onError(String utteranceId) {
                        JSObject data = new JSObject();
                        data.put("id", utteranceId);
                        notifyListeners("speechError", data);
                    }
                });

                isInitialized = true;
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text");
        Float rate = call.getFloat("rate", 1.0f);
        Float pitch = call.getFloat("pitch", 1.0f);
        Boolean flush = call.getBoolean("flush", true);

        if (text == null || text.trim().isEmpty()) {
            call.resolve();
            return;
        }

        if (tts == null || !isInitialized) {
            initTTS();
        }

        if (tts != null) {
            try {
                tts.setSpeechRate(rate != null ? rate : 1.0f);
                tts.setPitch(pitch != null ? pitch : 1.0f);

                int queueMode = (flush != null && flush) ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD;
                String utteranceId = "utt_" + System.currentTimeMillis();

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    Bundle params = new Bundle();
                    params.putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC);
                    tts.speak(text, queueMode, params, utteranceId);
                } else {
                    tts.speak(text, queueMode, null);
                }

                JSObject res = new JSObject();
                res.put("success", true);
                res.put("id", utteranceId);
                call.resolve(res);
                return;
            } catch (Exception e) {
                call.reject("Error al reproducir voz nativa: " + e.getMessage());
                return;
            }
        }

        call.reject("Motor TTS nativo no disponible");
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (tts != null) {
            try {
                tts.stop();
            } catch (Exception ignored) {}
        }
        call.resolve();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject res = new JSObject();
        res.put("available", isInitialized && tts != null);
        call.resolve(res);
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) {}
            tts = null;
        }
        super.handleOnDestroy();
    }
}
