import { State, Switch } from "@chkt/states/dist/state";
import { sendTextReply } from "./reply";
import { http_reply_code } from "./http";
import { ControllerContext } from "../controller/controller";


export async function respondText(
	code:http_reply_code,
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	sendTextReply(context.reply, code);

	return next.default(context);
}

export async function respondTextBadMethod(
	context:ControllerContext,
	next:Switch<ControllerContext>
) : Promise<State<ControllerContext>> {
	if (
		!('allowedMethods' in context.attributes) ||
		context.attributes.allowedMethods === null
	) return next.failure(context);

	const reply = context.reply;

	reply.setHeader('Allow', context.attributes.allowedMethods);

	sendTextReply(reply, http_reply_code.no_method);

	return next.success(context);
}
