(() => {
    let requests = new Map()
    let send = (elt, type, detail) => {
        let customEvent = new CustomEvent("fx:" + type, {detail: detail, cancelable:true, bubbles:true, composed:true})
        return elt.dispatchEvent(customEvent)
    }
    let attr = (elt, attrName, defaultVal) => {
        return elt.getAttribute(attrName) || defaultVal
    }
    let init = (elt) => {
        if(!send(elt, 'init')) return
        elt.addEventListener(attr(elt, 'fx-trigger', elt.matches('form') ? 'submit' : elt.matches('input, select, textarea') ? 'change' : 'click'),
            async (evt) => {
                let reqs = requests.get(elt) || []
                let targetSelector = attr(elt, 'fx-target')
                let target = targetSelector ? document.querySelector(targetSelector) : elt
                let headers = {"FX-Request": "true"}
                let method = attr(elt, 'fx-method', "GET").toUpperCase()
                let action = attr(elt, 'fx-action', "")
                let swap = attr(elt, 'fx-swap', 'outerHTML')
                let form = elt.form || elt.closest('form')
                let body = form && new FormData(form, evt.submitter) || new FormData()
                if(!form && elt.name) body.append(elt.name, elt.value)
                let abort = new AbortController()
                let drop = reqs.length > 0
                let cfg = {method, action, headers, target, swap, body, drop, signal:abort.signal, abort : ()=> abort.abort("asdf"), preventTriggerDefault: true, transition:true}
                if (!send(elt, "before", {evt, cfg, requests: reqs}) || cfg.drop) return
                if ((cfg.method === "GET" || cfg.method === "DELETE") && cfg.body) {
                    if (!cfg.body.entries().next().done) cfg.action += (cfg.action.indexOf("?") > 0 ? "&" : "?") + new URLSearchParams(cfg.body).toString()
                    cfg.body = null
                }
                if (cfg.preventTriggerDefault) evt.preventDefault()
                reqs.push(cfg)
                requests.set(elt, reqs)
                try {
                    if (cfg.confirm) {
                        let result = await cfg.confirm()
                        if (!result) return
                    }
                    cfg.response = await fetch(cfg.action, cfg)
                    cfg.text = await cfg.response.text()
                    if (!send(elt, "after", {evt, cfg})) return
                } catch (error) {
                    cfg.text = ""
                    if (!send(elt, "error", {evt, cfg, error})) return
                    if (error.name === "AbortError") return
                } finally {
                    reqs.splice(reqs.indexOf(cfg), 1)
                    if (reqs.length === 0) requests.delete(elt)
                    send(elt, "finally", {evt, cfg})
                }
                let doSwap = () => {
                    if (cfg.swap === 'outerHTML' || swap === 'innerHTML') {
                        target[cfg.swap] = cfg.text
                    } else {
                        target.insertAdjacentHTML(swap, cfg.text)
                    }
                }
                if (cfg.transition && document.startViewTransition) {
                    document.startViewTransition(doSwap)
                } else {
                    doSwap()
                }
            })
    }
    let process = (elt) => {
        if (elt instanceof Element) {
            if (!elt.matches('[fx-ignore]') && elt.closest('[fx-ignore]') == null && !send(elt, 'fx:process')) return
            if (elt.matches('[fx-action]')) init(elt)
            elt.querySelectorAll('[fx-action]').forEach((elt) => init(elt))
        }
    }
    document.addEventListener("DOMContentLoaded", () => {
        const observer = new MutationObserver((recs) => recs.forEach((r) => r.type === "childList" && r.addedNodes.forEach((n) => process(n))))
        observer.observe(document.body, {childList: true, subtree:true})
        process(document.body)
    })
})()