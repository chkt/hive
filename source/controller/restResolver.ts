import { StateDescriptionMap } from "@chkt/states/dist/create";

import { controllerAction, ControllerContext } from "./controller";
import {
	controller_action,
	resolveRequestMethod,
	respondBadMethod,
	respondBadRequest,
	respondNotFound
} from "./restTransforms";
import { decodeJsonRequest, encodeJsonReply, resolveRequestEncoding } from "../io/encodingTransforms";


export const startId = 'method';

export const resolver:StateDescriptionMap<ControllerContext> = {
	method : {
		transform : resolveRequestMethod,
		targets : [
			{ id : 'action', name : controller_action.list },
			{ id : 'action', name : controller_action.read },
			{ id : 'request_encoding', name : controller_action.create },
			{ id : 'request_encoding', name : controller_action.update },
			{ id : 'action', name : controller_action.delete },
			{ id : 'bad_method' }
		]
	},
	request_encoding : {
		transform : resolveRequestEncoding,
		targets : [{ id : 'decode_json', name : 'json'}, { id : 'bad_request' }]
	},
	decode_json : {
		transform : decodeJsonRequest,
		targets : [{ id : 'action' }, { id : 'bad_request' }]
	},
	action : {
		transform : controllerAction,
		targets : [
			{ id : 'encode_json' },
			{ id : 'bad_request', name : 'malformed' },
			{ id : 'not_found', name : 'not_found' },
			{ id : 'bad_method', name : 'no_action' },
			{ id : 'error' }
		]
	},
	encode_json : {
		transform : encodeJsonReply,
		targets : [{ id : 'end' }, { id : 'error' }]
	},
	bad_request : {
		transform : respondBadRequest,
		targets : [{ id : 'encode_json' }]
	},
	not_found : {
		transform : respondNotFound,
		targets : [{ id : 'encode_json' }]
	},
	bad_method : {
		transform : respondBadMethod,
		targets : [{ id : 'end' }]
	}
};
