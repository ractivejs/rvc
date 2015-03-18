// TODO more intelligent minification? removing comments?
// collapsing declarations?
export default function minifycss ( css ) {
	return css.replace( /^\s+/gm, '' );
}