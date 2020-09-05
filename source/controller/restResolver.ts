import { StateDescriptionMap } from '@chkt/states/dist/create';
import { decodeJsonRequest, encodeJsonReply, resolveRequestEncoding } from '../io/encodingTransforms';
import {
	applyReplyStatus,
	controller_action,
	filterAction,
	reply_status,
	resolveMethods,
	resolveRequestMethod,
	respondError,
	respondStatus
} from './restTransforms';
import { controllerAction, ControllerContext, state_result_type } from './controller';


export const startId = 'resolve_method';

export const resolver:StateDescriptionMap<ControllerContext> = {
	resolve_method : {
		transform : resolveRequestMethod,
		targets : [
			{ id : 'filter_action' },
			{ id : reply_status.request_unsupported }
		]
	},
	filter_action : {
		transform : filterAction,
		targets : [
			{ id : 'action', name : controller_action.list },
			{ id : 'action', name : controller_action.read },
			{ id : 'request_encoding', name : controller_action.create },
			{ id : 'request_encoding', name : controller_action.update },
			{ id : 'action', name : controller_action.delete },
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
		transform : applyReplyStatus.bind(null, reply_status.service_unavailable),
		targets : [{ id : 'error_reply' }]
	},
	[ reply_status.error ] : {
		transform : applyReplyStatus.bind(null, reply_status.error),
		targets : [{ id : 'error_reply' }]
	},
	[ reply_status.request_unsupported ] : {
		transform : applyReplyStatus.bind(null, reply_status.request_unsupported),
		targets : [{ id : 'error_reply' }]
	},
	[ reply_status.action_unavailable ] : {
		transform : resolveMethods,
		targets : [{ id : 'error_reply'}]
	},
	[ reply_status.request_malformed ] : {
		transform : applyReplyStatus.bind(null, reply_status.request_malformed),
		targets : [{ id : 'error_reply'}]
	},
	[ reply_status.mime_unsupported ] : {
		transform : applyReplyStatus.bind(null, reply_status.mime_unsupported),
		targets : [{ id : 'error_reply' }]
	},
	[ reply_status.resource_missing ] : {
		transform : applyReplyStatus.bind(null, reply_status.resource_missing),
		targets : [{ id : 'error_reply' }]
	},
	[ reply_status.ok ] : {
		transform : applyReplyStatus.bind(null, reply_status.ok),
		targets : [{ id : 'encode_json' }]
	},
	error_reply : {
		transform : respondStatus,
		targets : [{ id : 'encode_json' }, { id : 'error' }]
	},
	encode_json : {
		transform : encodeJsonReply,
		targets : [{ id : 'end' }, { id : 'error' }]
	},
	error : {
		transform : respondError,
		targets : [{ id : 'end' }]
	}
};
