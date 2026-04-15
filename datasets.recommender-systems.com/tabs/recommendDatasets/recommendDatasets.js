import { ApiService } from "../../apiService.js";

var datasets = null;

export async function initialize(queryOptions) {
  datasets = await ApiService.getDatasets();
}
