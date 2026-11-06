# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# --- Capacitor + R8 en modo completo (F10.1, v8.5.62) ---
# Las reglas de consumo de Capacitor conservan las clases anotadas con
# @CapacitorPlugin, pero no los TIPOS de anotación, que se leen por reflexión
# (Class.getAnnotation). Sin ellos, R8 deduce que PluginHandle.pluginAnnotation
# solo puede ser null, borra el campo y compila Bridge.getPermissionStates()
# como un `throw null` literal: el primer checkPermissions() de cualquier
# plugin mata el proceso en el hilo CapacitorPlugins (la app se cerraba al
# abrir Ajustes con el recordatorio encendido, y al encenderlo).
# Medido en el DEX del APK v8.5.61: Plugin.getPermissionStates acababa en
# `const/4 v0, #0; throw v0`. Estas dos reglas devuelven el método real.
-keep class com.getcapacitor.PluginHandle { *; }
-keep @interface com.getcapacitor.** { *; }
