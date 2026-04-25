package com.pisotab.app.ui

import android.graphics.drawable.Drawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.pisotab.app.R

data class LauncherAppItem(
    val packageName: String,
    val appName: String,
    val icon: Drawable
)

class LauncherAdapter(
    private val onAppClick: (LauncherAppItem) -> Unit
) : RecyclerView.Adapter<LauncherAdapter.VH>() {

    private val items = mutableListOf<LauncherAppItem>()

    fun setItems(list: List<LauncherAppItem>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_launcher_app, parent, false)
        return VH(v)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = items[position]
        holder.icon.setImageDrawable(item.icon)
        holder.name.text = item.appName
        holder.itemView.setOnClickListener { onAppClick(item) }
    }

    override fun getItemCount() = items.size

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        val icon: ImageView = v.findViewById(R.id.iv_app_icon)
        val name: TextView  = v.findViewById(R.id.tv_app_name)
    }
}
