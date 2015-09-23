import Ractive from 'ractive';
import rcu from 'rcu';
import amdLoader from './utils/amd-loader';
import load from './load';
import build from './build';

rcu.init( Ractive );

let rvc = amdLoader( 'rvc', 'html', ( name, source, req, callback, errback, config ) => {
	if ( config.isBuild ) {
		build( name, source, callback, errback );
	} else {
		load( name, req, source, callback, errback );
	}
});

export default rvc;
