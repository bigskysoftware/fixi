(()=>{
	let init = elt=>{
		let options = {},
			closest = elt,
			send = (type, detail, bubbles=true) => elt.dispatchEvent(new CustomEvent("fx:"+type, {detail, cancelable:true, bubbles, composed:true})),
			attr = (attr, defaultVal) => (closest = elt.closest(`[fx-${attr}]`)) ? (closest?.getAttribute("fx-"+attr) || true): defaultVal
		if (elt.__fixi || attr("ignore") || !send("init", {options})) return
		elt.__fixi = async evt=>{
			let reqs = elt.__fixi.requests ||= new Set(),
				ac = new AbortController(),
				form = elt.form || elt.closest("form"),
				body = new FormData(form ?? undefined, evt.submitter)
			if (!form && elt.name) body.append(elt.name, elt.value)
			let cfg = {
				trigger:evt,
				action:attr("action"),
				method:attr("method", "GET").toUpperCase(),
				target:document.querySelector(attr("target")) ?? closest ?? elt,
				swap:attr("swap", "outerHTML"),
				body,
				drop:reqs.size,
				headers:{"FX-Request":"true"},
				abort:ac.abort.bind(ac),
				signal:ac.signal,
				preventTrigger:true,
				transition:document.startViewTransition?.bind(document),
				fetch:fetch.bind(window)
			}
			let go = send("config", {cfg, requests:reqs})
			if (cfg.preventTrigger) evt.preventDefault()
			if (!go || cfg.drop) return
			if (/GET|DELETE/.test(cfg.method)) {
				let params = new URLSearchParams(cfg.body)
				if (params.size)
					cfg.action += (/\?/.test(cfg.action) ? "&" : "?") + params
				cfg.body = null
			}
			reqs.add(cfg)
			try {
				if (cfg.confirm && !await cfg.confirm()) return
				if (!send("before", {cfg, requests:reqs})) return
				cfg.response = await cfg.fetch(cfg.action, cfg)
				cfg.text = await cfg.response.text()
				if (!send("after", {cfg})) return
			} catch(error) {
				return send("error", {cfg, error})
			} finally {
				reqs.delete(cfg)
				send("finally", {cfg})
			}
			let doSwap = ()=>{
				if (cfg.swap instanceof Function)
					return cfg.swap(cfg)
				else if (/(before|after)(start|end)/.test(cfg.swap))
					cfg.target.insertAdjacentHTML(cfg.swap, cfg.text)
				else if (cfg.swap in cfg.target)
					cfg.target[cfg.swap] = cfg.text
				else throw cfg.swap
			}
			await cfg.transition ? cfg.transition(doSwap).finished: doSwap()
			send("swapped", {cfg})
		}
		elt.addEventListener(
			attr("trigger", elt.matches("form") ? "submit" : elt.matches("input:not([type=button]),select,textarea") ? "change" : "click"),
			elt.__fixi, options)
		send("inited", {}, false)
	},
	process = elt=>{
		if (elt instanceof Element) {
			let attrs = "[fx-action]"
			if (elt.matches(attrs)) init(elt)
			elt.querySelectorAll(attrs).forEach(init)
		}
	}
	document.addEventListener("fx:process", evt=>process(evt.target))
	document.addEventListener("DOMContentLoaded", ()=>{
		(document.__fixi_mo = new MutationObserver(recs=>recs.forEach(r=>r.type === "childList" && r.addedNodes.forEach(process))))
			.observe(document.body, {childList:true, subtree:true})
		process(document.body)
	})
})()