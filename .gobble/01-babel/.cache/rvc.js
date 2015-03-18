import Ractive from "ractive";
import amdLoader from "./amd-loader";
import rcu from "rcu";
import load from "./load";
import build from "./build";

rcu.init(Ractive);

var rvc = amdLoader("rvc", "html", function (name, source, req, callback, errback, config) {
	if (config.isBuild) {
		build(name, source, callback, errback);
	} else {
		load(name, req, source, callback, errback);
	}
});

export default rvc;