(()=>{
	let send = (elt, type, detail, bub)=>elt.dispatchEvent(new CustomEvent("fx:" + type, {detail, cancelable:true, bubbles:bub !== false, composed:true}))
	let attr = (elt, name, defaultVal)=>elt.getAttribute(name) || defaultVal
	let ignore = (elt)=>elt.closest("[fx-ignore]") != null
	let init = (elt)=>{
		let options = {}
		if (elt.__fixi || ignore(elt) || !send(elt, "init", {options})) return
		elt.__fixi = async(evt)=>{
			let reqs = elt.__fixi.requests ||= new Set()
			let form = elt.form || elt.closest("form")
			let body = new FormData(form ?? undefined, evt.submitter)
			if (!form && elt.name) body.append(elt.name, elt.value)
			let ac = new AbortController()
			let cfg = {
				trigger:evt,
				action:attr(elt, "fx-action"),
				method:attr(elt, "fx-method", "GET").toUpperCase(),
				target: document.querySelector(attr(elt, "fx-target")) ?? elt,
				swap:attr(elt, "fx-swap", "outerHTML"),
				body,
				drop:reqs.size,
				headers:{"FX-Request":"true"},
				abort:ac.abort.bind(ac),
				signal:ac.signal,
				preventTrigger:true,
				transition:document.startViewTransition?.bind(document),
				fetch:fetch.bind(window)
			}
			let go = send(elt, "config", {cfg, requests:reqs})
			if (cfg.preventTrigger) evt.preventDefault()
			if (!go || cfg.drop) return
			if (/GET|DELETE/.test(cfg.method)){
				let params = new URLSearchParams(cfg.body)
				if (params.size)
					cfg.action += (/\?/.test(cfg.action) ? "&" : "?") + params
				cfg.body = null
			}
			reqs.add(cfg)
			try {
				if (cfg.confirm){
					let result = await cfg.confirm()
					if (!result) return
				}
				if (!send(elt, "before", {cfg, requests:reqs})) return
				cfg.response = await cfg.fetch(cfg.action, cfg)
				cfg.text = await cfg.response.text()
				if (!send(elt, "after", {cfg})) return
			} catch(error) {
				send(elt, "error", {cfg, error})
				return
			} finally {
				reqs.delete(cfg)
				send(elt, "finally", {cfg})
			}
			let doSwap = ()=>{
				if (cfg.swap instanceof Function)
					return cfg.swap(cfg)
				else if (/(before|after)(start|end)/.test(cfg.swap))
					cfg.target.insertAdjacentHTML(cfg.swap, cfg.text)
				else if(cfg.swap in cfg.target)
					cfg.target[cfg.swap] = cfg.text
				else throw cfg.swap
			}
			if (cfg.transition)
				await cfg.transition(doSwap).finished
			else
				await doSwap()
			send(elt, "swapped", {cfg})
		}
		elt.__fixi.evt = attr(elt, "fx-trigger", elt.matches("form") ? "submit" : elt.matches("input:not([type=button]),select,textarea") ? "change" : "click")
		elt.addEventListener(elt.__fixi.evt, elt.__fixi, options)
		send(elt, "inited", {}, false)
	}
	let process = (elt)=>{
		if (elt instanceof Element){
			if (ignore(elt)) return
			if (elt.matches("[fx-action]")) init(elt)
			elt.querySelectorAll("[fx-action]").forEach(init)
		}
	}
	document.addEventListener("fx:process", (evt)=>process(evt.target))
	document.addEventListener("DOMContentLoaded", ()=>{
		document.__fixi_mo = new MutationObserver((recs)=>recs.forEach((r)=>r.type === "childList" && r.addedNodes.forEach((n)=>process(n))))
		document.__fixi_mo.observe(document.body, {childList:true, subtree:true})
		process(document.body)
	})
})()
