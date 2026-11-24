package com.ngxnhtn.streakky;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.ngxnhtn.streakky.widget.WidgetsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // the app's own plugin, for the home-screen widget (ticket 20)
        registerPlugin(WidgetsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
