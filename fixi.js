(()=>{
  let send = (elt, type, detail, bub)=>elt.dispatchEvent(new CustomEvent("fx:" + type, {detail:detail, cancelable:true, bubbles:bub!==false, composed:true}))
  let attr = (elt, attrName, defaultVal)=>elt.getAttribute(attrName) || defaultVal
  let ignore = (elt)=>elt.matches("[fx-ignore]") || elt.closest("[fx-ignore]") != null
  let init = (elt)=>{
    let options = {}
    if (elt.__fixi || ignore(elt) || !send(elt, "init", {options})) return
    elt.__fixi = async(evt)=>{
      let reqs = elt.__fixi.requests || (elt.__fixi.requests = [])
      let targetSelector = attr(elt, "fx-target")
      let target = targetSelector ? document.querySelector(targetSelector) : elt
      let headers = {"FX-Request":"true"}
      let method = attr(elt, "fx-method", "GET").toUpperCase()
      let action = attr(elt, "fx-action", "")
      let swap = attr(elt, "fx-swap", "outerHTML")
      let form = elt.form || elt.closest("form")
      let body = form && new FormData(form, evt.submitter) || new FormData()
      if (!form && elt.name) body.append(elt.name, elt.value)
      let abort = new AbortController()
      let drop = reqs.length > 0
      let cfg = {trigger:evt, method, action, headers, target, swap, body, drop, signal:abort.signal, abort:(r)=>abort.abort(r), preventTriggerDefault:true, transition:true}
      if (!send(elt, "config", {evt, cfg, requests:reqs}) || cfg.drop) return
      if ((cfg.method === "GET" || cfg.method === "DELETE") && cfg.body){
        if (!cfg.body.entries().next().done) cfg.action += (cfg.action.indexOf("?") > 0 ? "&" : "?") + new URLSearchParams(cfg.body).toString()
        cfg.body = null
      }
      if (cfg.preventTriggerDefault) evt.preventDefault()
      reqs.push(cfg)
      try {
        if (cfg.confirm){
          let result = await cfg.confirm()
          if (!result) return
        }
        if (!send(elt, "before", {evt, cfg, requests:reqs})) return
        cfg.response = await fetch(cfg.action, cfg)
        cfg.text = await cfg.response.text()
        if (!send(elt, "after", {evt, cfg})) return
      } catch(error) {
        cfg.text = ""
        if (!send(elt, "error", {evt, cfg, error})) return
        if (error.name === "AbortError") return
      } finally {
        reqs.splice(reqs.indexOf(cfg), 1)
        send(elt, "finally", {evt, cfg})
      }
      let doSwap = ()=>{
        cfg.parent = cfg.target.parentElement
        if (cfg.swap instanceof Function){
          return cfg.swap(cfg)
        } else if (cfg.swap === "outerHTML" || cfg.swap === "innerHTML"){
          cfg.target[cfg.swap] = cfg.text
        } else {
          cfg.target.insertAdjacentHTML(cfg.swap, cfg.text)
        }
        process(cfg.parent)
      }
      if (cfg.transition && document.startViewTransition){
        await document.startViewTransition(doSwap).finished
      } else {
        await doSwap()
      }
      send(elt, "swapped", {cfg})
    }
    elt.__fixi.evt = attr(elt, "fx-trigger", elt.matches("form") ? "submit" : elt.matches("input,select,textarea") ? "change" : "click")
    elt.addEventListener(elt.__fixi.evt, elt.__fixi, options)
    send(elt, "inited", {}, false)
  }
  let process = (elt)=>{
    if (elt instanceof Element){
      if (elt.matches("[fx-action]")) init(elt)
      elt.querySelectorAll("[fx-action]").forEach((elt)=>init(elt))
    }
  }
  document.addEventListener("DOMContentLoaded", ()=>{
    document.addEventListener("fx:process", (evt)=>process(evt.target))
    process(document.body)
  })
})()
