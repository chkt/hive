import { StateDescriptionMap } from '@chkt/states/dist/create';
import { http_reply_code } from '../io/http';
import { decodeJsonRequest, encodeJsonReply, resolveRequestEncoding } from '../io/encodingTransforms';
import { respondText } from '../io/responseTransforms';
import { reply_status } from './apiTransforms';
import {
	encodeRestReplyStatus,
	rest_action,
	filterRestAction,
	decodeRestAllowedMethods,
	decodeRestAction,
	respondRestStatus
} from './restTransforms';
import { controllerAction, ControllerContext, state_result_type } from './controller';


export const startId = 'resolve_method';

export const resolver:StateDescriptionMap<ControllerContext> = {
	resolve_method : {
		transform : decodeRestAction,
		targets : [
			{ id : 'filter_action' },
			{ id : reply_status.request_unsupported }
		]
	},
	filter_action : {
		transform : filterRestAction,
		targets : [
			{ id : 'action', name : rest_action.list },
			{ id : 'action', name : rest_action.read },
			{ id : 'request_encoding', name : rest_action.create },
			{ id : 'request_encoding', name : rest_action.update },
			{ id : 'action', name : rest_action.delete },
			{ id : reply_status.action_unavailable }
		]
	},
	request_encoding : {
		transform : resolveRequestEncoding,
		targets : [
			{ id : 'decode_json', name : 'json' },
			{ id : reply_status.mime_unsupported, name : 'mime_mismatch' },
			{ id : reply_status.request_malformed }
		]
	},
	decode_json : {
		transform : decodeJsonRequest,
		targets : [{ id : 'action' }, { id : reply_status.request_malformed }]
	},
	action : {
		transform : controllerAction,
		targets : [
			{ id : 'encode_json' },
			{ id : reply_status.resource_missing, name : state_result_type.not_found },
			{ id : reply_status.action_unavailable, name : state_result_type.no_action },
			{ id : reply_status.request_malformed, name : state_result_type.malformed },
			{ id : reply_status.service_unavailable, name : state_result_type.unavailable },
			{ id : reply_status.error, name : state_result_type.error }
		]
	},
	[ reply_status.service_unavailable ] : {
		transform : encodeRestReplyStatus.bind(null, reply_status.service_unavailable),
		targets : [{ id : 'error_reply' }]
	},
	[ reply_status.error ] : {
		transform : encodeRestReplyStatus.bind(null, reply_status.error),
		targets : [{ id : 'error_reply' }]
	},
	[ reply_status.request_unsupported ] : {
		transform : encodeRestReplyStatus.bind(null, reply_status.request_unsupported),
		targets : [{ id : 'error_reply' }]
	},
	[ reply_status.action_unavailable ] : {
		transform : decodeRestAllowedMethods,
		targets : [{ id : 'error_reply'}]
	},
	[ reply_status.request_malformed ] : {
		transform : encodeRestReplyStatus.bind(null, reply_status.request_malformed),
		targets : [{ id : 'error_reply'}]
	},
	[ reply_status.mime_unsupported ] : {
		transform : encodeRestReplyStatus.bind(null, reply_status.mime_unsupported),
		targets : [{ id : 'error_reply' }]
	},
	[ reply_status.resource_missing ] : {
		transform : encodeRestReplyStatus.bind(null, reply_status.resource_missing),
		targets : [{ id : 'error_reply' }]
	},
	[ reply_status.ok ] : {
		transform : encodeRestReplyStatus.bind(null, reply_status.ok),
		targets : [{ id : 'encode_json' }]
	},
	error_reply : {
		transform : respondRestStatus,
		targets : [{ id : 'encode_json' }, { id : 'error' }]
	},
	encode_json : {
		transform : encodeJsonReply,
		targets : [{ id : 'end' }, { id : 'error' }]
	},
	error : {
		transform : respondText.bind(null, http_reply_code.error),
		targets : [{ id : 'end' }]
	}
};
