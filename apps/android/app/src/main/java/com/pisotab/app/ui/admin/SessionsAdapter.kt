package com.pisotab.app.ui.admin

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.pisotab.app.R
import com.pisotab.app.data.remote.SessionListItem
import java.text.SimpleDateFormat
import java.util.*

class SessionsAdapter(private var items: List<SessionListItem>) :
    RecyclerView.Adapter<SessionsAdapter.VH>() {

    private val dateFormat = SimpleDateFormat("MMM d, h:mm a", Locale.getDefault())

    inner class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvDeviceName: TextView = view.findViewById(R.id.tv_device_name)
        val tvAmount: TextView     = view.findViewById(R.id.tv_amount)
        val tvStartedAt: TextView  = view.findViewById(R.id.tv_started_at)
        val tvDuration: TextView   = view.findViewById(R.id.tv_duration)
        val tvStatus: TextView     = view.findViewById(R.id.tv_status)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_session_row, parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val s = items[position]
        holder.tvDeviceName.text = s.device_name ?: s.device_id
        holder.tvAmount.text     = "₱%.2f".format(s.amount_paid)
        holder.tvStartedAt.text  = dateFormat.format(Date(s.started_at * 1000L))
        holder.tvDuration.text   = "${s.duration_mins} min"
        holder.tvStatus.text     = s.status
        holder.tvStatus.setTextColor(
            when (s.status) {
                "active"  -> android.graphics.Color.parseColor("#22C55E")
                "paused"  -> android.graphics.Color.parseColor("#F59E0B")
                "ended"   -> android.graphics.Color.parseColor("#94A3B8")
                else      -> android.graphics.Color.parseColor("#94A3B8")
            }
        )
    }

    fun update(newItems: List<SessionListItem>) {
        items = newItems
        notifyDataSetChanged()
    }
}
