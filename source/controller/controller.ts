import { Context, State, Switch } from '@chkt/states/dist/state';
import { contextToState } from '@chkt/states/dist/traverse';

import { Hash } from '../common/base/Hash';
import { JsonConformHash } from '../common/base/Json';
import { httpCodeType, HttpDirectCode, HttpRedirectCode, messageOfCode, typeOfCode } from '../io/http';
import { HttpContext, isHttpContext } from '../io/context';
import { RouteMatch, RouteParams } from '../route/route';


interface CommonResult {
	readonly context : ControllerContext;
}

interface ReplyResult
extends CommonResult {
	readonly code : HttpDirectCode;
}

interface RedirectResult
extends CommonResult {
	readonly code : HttpRedirectCode;
	readonly location : string;
}

export interface StateResult
extends CommonResult {
	readonly target : string;
}

export type Result = ReplyResult|RedirectResult|StateResult;

function isReplyResult(result:CommonResult) : result is ReplyResult {
	const code = (result as ReplyResult).code;

	return code !== undefined && typeOfCode(code) !== httpCodeType.redirect;
}

function isRedirectResult(result:CommonResult) : result is RedirectResult {
	const code = (result as RedirectResult).code;

	return code !== undefined && typeOfCode(code) === httpCodeType.redirect;
}

function isStateResult(result:CommonResult) : result is StateResult {
	return 'target' in result;
}

export function createReturnReply(code:HttpDirectCode, context:ControllerContext) : ReplyResult {
	return { code, context };
}

export function createRedirectReturn(
	code:HttpRedirectCode,
	location:string,
	context:ControllerContext
) : RedirectResult {
	return { code, location, context };
}

export function createReturnState(target:string, context:ControllerContext) : StateResult {
	return { target, context };
}


export const enum state_result_type {
	error = 'error',
	malformed = 'malformed',
	not_found = 'not_found',
	no_action = 'no_action',
	no_auth = 'no_auth',
	unavailable = 'unavailable'
}


export type ControllerAction = (context:ControllerContext) => Promise<Result>;
export type ControllerActions = Hash<ControllerAction>;

export interface Controller {
	readonly resolve : contextToState<ControllerContext>;
	readonly actions : ControllerActions;
	readonly selectedAction : string;
}

export function createController(
	resolve:contextToState<ControllerContext>,
	actions:ControllerActions,
	defaultAction:string = ''
) : Controller {
	return {
		resolve,
		actions,
		selectedAction : defaultAction
	};
}

export function applyControllerAction(controller:Controller, action:string) : Controller {
	return {
		...controller,
		selectedAction : action
	};
}


export interface ControllerContext
extends HttpContext {
	readonly params : Readonly<RouteParams>;
	readonly controller : Controller;
	readonly view : JsonConformHash;
}

export function isControllerContext(context:Context) : context is ControllerContext {
	return isHttpContext(context) &&
		'params' in context &&
		'controller' in context &&
		'view' in context;
}

export function createControllerContext(
	context:HttpContext,
	match:RouteMatch,
	view:JsonConformHash = {}
) : ControllerContext {
	return {
		...context,
		...match,
		attributes : { ...context.attributes, ...match.attributes },
		view
	};
}


export async function controllerAction(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	const controller = context.controller;

	if (controller.selectedAction in controller.actions) {
		const action = controller.actions[controller.selectedAction];
		const result = await action(context);

		if (isStateResult(result)) return next.named(result.target, result.context);
		else {
			const reply = context.reply;

			reply.statusCode = result.code;
			reply.statusMessage = messageOfCode(result.code);

			if (isRedirectResult(result)) reply.setHeader('Location', result.location);

			return next.default(result.context);
		}
	}
	else return next.named(state_result_type.no_action, context);
}
