package com.mitu.dev

import android.os.Bundle
import android.view.WindowManager

class MainActivity : TauriActivity() {
	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
	}
}