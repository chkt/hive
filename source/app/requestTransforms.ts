import { log_level } from '@chkt/onceupon/dist/level';
import { State, Switch } from '@chkt/states/dist/state';
import { isErrorState } from '@chkt/states/dist/traverse';
import { Injector } from '../inject/injector';
import { httpResponseCode } from '../io/http';
import { createErrorContext, HttpContext, isErrorContext } from '../io/context';
import { sendTextReply } from '../io/reply';
import { isControllerContext } from '../controller/controller';
import { AppCommonProvider } from './app';


export const enum controller_boundary {
	success = 'success',
	notice = 'notice',
	error = 'error',
	no_controller = 'no_controller'
}


export async function noop(
	context:HttpContext,
	next:Switch<HttpContext>
) : Promise<State<HttpContext>> {
	return next.default(context);
}


export async function controllerTransform(
	context:HttpContext,
	next:Switch<HttpContext>
) : Promise<State<HttpContext>> {
	if (!isControllerContext(context)) return next.named(controller_boundary.no_controller, context);

	const state = await context.controller.resolve(context);

	if (isErrorState(state)) return next.failure(createErrorContext(context, state.error.message));
	else if (isErrorContext(state.context)) return next.named(controller_boundary.notice, state.context);
	else return next.success(state.context);
}


export async function respondNoRoute(
	context:HttpContext,
	next:Switch<HttpContext>
) : Promise<State<HttpContext>> {
	const request = context.request;

	sendTextReply(context.reply, httpResponseCode.notFound);

	return next.failure(createErrorContext(context, `no route ${ request.method } ${ request.url }`));
}

export async function respondRouteError(
	context:HttpContext,
	next:Switch<HttpContext>
) : Promise<State<HttpContext>> {
	const request = context.request;

	return next.failure(isErrorContext(context) ?
		context :
		createErrorContext(context, `bad route ${ request.method } ${ request.url }`)
	);
}

export async function respondNoController(
	context:HttpContext,
	next:Switch<HttpContext>
) : Promise<State<HttpContext>> {
	const request = context.request;

	return next.failure(createErrorContext(context, `no controller ${ request.method } ${ request.url }`));
}

export async function respondError(
	context:HttpContext,
	next:Switch<HttpContext>
) : Promise<State<HttpContext>> {
	sendTextReply(context.reply, httpResponseCode.error);

	return next.failure(context);
}

export async function logError(
	injector:Injector<AppCommonProvider>,
	context:HttpContext,
	next:Switch<HttpContext>
) : Promise<State<HttpContext>> {
	if (isErrorContext(context)) injector.get('logger').failure(context.error, log_level.error);

	return next.default(context);
}

export async function endReply(
	context:HttpContext,
	next:Switch<HttpContext>
) : Promise<State<HttpContext>> {
	context.reply.end();

	return next.default(context);
}
