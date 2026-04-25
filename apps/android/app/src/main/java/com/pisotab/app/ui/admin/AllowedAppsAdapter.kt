package com.pisotab.app.ui.admin

import android.content.pm.PackageInfo
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.pisotab.app.R

data class AppItem(
    val packageName: String,
    val appName: String,
    var isAllowed: Boolean,
    val icon: android.graphics.drawable.Drawable?
)

class AllowedAppsAdapter(private var items: List<AppItem>) :
    RecyclerView.Adapter<AllowedAppsAdapter.VH>() {

    inner class VH(view: View) : RecyclerView.ViewHolder(view) {
        val ivIcon: ImageView    = view.findViewById(R.id.iv_app_icon)
        val tvName: TextView     = view.findViewById(R.id.tv_app_name)
        val tvPackage: TextView  = view.findViewById(R.id.tv_package_name)
        val cbAllowed: CheckBox  = view.findViewById(R.id.cb_allowed)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_app_row, parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val app = items[position]
        holder.ivIcon.setImageDrawable(app.icon)
        holder.tvName.text    = app.appName
        holder.tvPackage.text = app.packageName
        holder.cbAllowed.isChecked = app.isAllowed
        holder.cbAllowed.setOnCheckedChangeListener { _, checked -> app.isAllowed = checked }
        holder.itemView.setOnClickListener { holder.cbAllowed.toggle() }
    }

    fun updateFilter(filtered: List<AppItem>) {
        items = filtered
        notifyDataSetChanged()
    }

    fun getAllowedPackages(): Set<String> = items.filter { it.isAllowed }.map { it.packageName }.toSet()
}
