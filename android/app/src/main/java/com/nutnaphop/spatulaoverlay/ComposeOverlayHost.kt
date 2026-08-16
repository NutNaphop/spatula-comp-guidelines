package com.nutnaphop.spatulaoverlay

import android.content.Context
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.lifecycle.setViewTreeViewModelStoreOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner

/**
 * Compose refuses to run in a window we add to WindowManager ourselves: it
 * looks up a lifecycle, a ViewModelStore and a SavedStateRegistry from the
 * view tree, and a Service provides none of them. An Activity would.
 *
 * This host supplies all three, so overlay windows can be written as
 * composables like the rest of the app. Create one per window and call
 * [destroy] when the window is removed - the lifecycle has to reach
 * DESTROYED or Compose leaks the composition.
 */
class ComposeOverlayHost(context: Context) :
    LifecycleOwner, ViewModelStoreOwner, SavedStateRegistryOwner {

    private val lifecycleRegistry = LifecycleRegistry(this)
    private val savedStateController = SavedStateRegistryController.create(this)

    override val lifecycle: Lifecycle get() = lifecycleRegistry
    override val viewModelStore = ViewModelStore()
    override val savedStateRegistry: SavedStateRegistry
        get() = savedStateController.savedStateRegistry

    val view: ComposeView = ComposeView(context)

    init {
        savedStateController.performRestore(null)
        own(view)
    }

    /**
     * Compose resolves the owners from the window's **root** view, not from
     * the ComposeView. If the ComposeView is wrapped in anything before being
     * handed to WindowManager, the wrapper is the root and has to carry them
     * too - otherwise attaching throws "ViewTreeLifecycleOwner not found".
     */
    fun own(root: View) {
        root.setViewTreeLifecycleOwner(this)
        root.setViewTreeViewModelStoreOwner(this)
        root.setViewTreeSavedStateRegistryOwner(this)
    }

    /** Attach content and move to RESUMED, which is when Compose starts drawing. */
    fun setContent(content: @Composable () -> Unit): View {
        view.setContent(content)
        lifecycleRegistry.currentState = Lifecycle.State.RESUMED
        return view
    }

    fun destroy() {
        lifecycleRegistry.currentState = Lifecycle.State.DESTROYED
        viewModelStore.clear()
    }
}
