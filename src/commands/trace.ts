import { window } from 'vscode';
import { fluxTools } from '../flux/fluxTools';
import { kubernetesTools } from '../kubernetes/kubernetesTools';
import { AnyResourceNode } from '../views/nodes/anyResourceNode';
import { WorkloadNode } from '../views/nodes/workloadNode';

/**
 * Run flux trace for the Workloads tree view node.
 */
export async function trace(node: AnyResourceNode | WorkloadNode) {
	const resourceName = node.resource.metadata?.name || '';
	const resourceNamespace = node.resource.metadata?.namespace || 'flux-system';
	const resourceKind = node.resource.kind || '';
	let resourceApiVersion = node.resource.apiVersion || '';

	if (!resourceName || !resourceKind) {
		window.showErrorMessage('"name" and "kind" are required to run `flux trace`.');
		return;
	}

	// flux tree fetched items don't have the "apiVersion" property
	if (!resourceApiVersion) {
		const resource = await kubernetesTools.getResource(resourceName, resourceNamespace, resourceKind);
		const apiVersion = resource?.apiVersion;
		if (!apiVersion && !apiVersion) {
			window.showErrorMessage('"apiVersion" is required to run `flux trace`');
			return;
		}
		resourceApiVersion = apiVersion;
	}

	await fluxTools.trace(resourceName, resourceKind, resourceApiVersion, resourceNamespace);
}
