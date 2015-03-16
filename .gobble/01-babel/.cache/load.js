

export default load;
import rcu from "rcu";
function load(base, req, source, callback, errback) {
	rcu.make(source, {
		url: "" + base + ".html",
		loadImport: function (name, path, baseUrl, callback) {
			path = rcu.resolve(path, base);
			req(["rvc!" + path.replace(/\.html$/, "")], callback);
		},
		loadModule: function (name, path, baseUrl, callback) {
			req([path], callback);
		},
		require: function (name) {
			return req(name);
		}
	}, callback, errback);
}