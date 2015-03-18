// TODO more intelligent minification? removing comments?
// collapsing declarations?
export default minifycss;

function minifycss(css) {
	return css.replace(/^\s+/gm, "");
}