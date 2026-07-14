import pandas as pd
import requests
import numpy as np
from sklearn.decomposition import PCA
from sklearn.impute import SimpleImputer
import requests
from collections import defaultdict

# Adjust admin header and secret key
ADMIN_HEADER = 'Adminkey'
ADMIN_SECRET_KEY = 'Pa55w0rd'

def addPerformanceResults():
    df = pd.read_csv('results.csv') # give your csv file (only new results!)

    grouped_df = df.groupby(['algorithm_name', 'data_set_name']).agg({
        'NDCG@1': 'mean',
        'NDCG@3': 'mean',
        'NDCG@5': 'mean',
        'NDCG@10': 'mean',
        'NDCG@20': 'mean',
        'HR@1': 'mean',
        'HR@3': 'mean',
        'HR@5': 'mean',
        'HR@10': 'mean',
        'HR@20': 'mean',
        'Recall@1': 'mean',
        'Recall@3': 'mean',
        'Recall@5': 'mean',
        'Recall@10': 'mean',
        'Recall@20': 'mean',
        'algorithm_config_index': 'first',
        'algorithm_configuration': 'first',
        'num_users': 'first',
        'num_items': 'first',
        'num_interactions': 'first',
        'user_item_ratio': 'first',
        'item_user_ratio': 'first',
        'density': 'first',
        'feedback_type': 'first',
        'highest_num_rating_by_single_user': 'first',
        'lowest_num_rating_by_single_user': 'first',
        'highest_num_rating_on_single_item': 'first',
        'lowest_num_rating_on_single_item': 'first',
        'mean_num_ratings_by_user': 'first',
        'mean_num_ratings_on_item': 'first'
    }).reset_index()

    # Prepare HTTP call
    url = 'https://finally.recommender-systems.com/index.php?action=admin&task=addResults'
    headers = {
        'Content-Type': 'application/json',
        ADMIN_HEADER: ADMIN_SECRET_KEY
    }

    body = {
        'results': []
    }

    start_index = 0
    numof_results_to_send_per_request = 1000
    counter = 0
    for index, row in grouped_df.iterrows():
        if index < start_index:
            continue

        counter = counter + 1

        body['results'].append({
            'algorithmName': row['algorithm_name'],
            'datasetName': row['data_set_name'],
            'algorithmConfigIndex': row['algorithm_config_index'],
            'algorithmConfiguration': row['algorithm_configuration'],
            'numberOfUsers': int(row['num_users']),
            'numberOfItems': int(row['num_items']),
            'numberOfInteractions': int(row['num_interactions']),
            'userItemRatio': float(row['user_item_ratio']),
            'itemUserRatio': float(row['item_user_ratio']),
            'density': float(row['density']),
            'feedbackType': str(row['feedback_type']),
            'highestNumberOfRatingBySingleUser': int(row['highest_num_rating_by_single_user']),
            'LowestNumberOfRatingBySingleUser': int(row['lowest_num_rating_by_single_user']),
            'highestNumberOfRatingOnSingleItem': int(row['highest_num_rating_on_single_item']),
            'lowestNumberOfRatingOnSingleItem': int(row['lowest_num_rating_on_single_item']),
            'meanNumberOfRatingsByUser': float(row['mean_num_ratings_by_user']),
            'meanNumberOfRatingsOnItem': float(row['mean_num_ratings_on_item']),
            'ndcg': {
                'one': row['NDCG@1'],
                'three': row['NDCG@3'],
                'five': row['NDCG@5'],
                'ten': row['NDCG@10'],
                'twenty': row['NDCG@20'],
            },
            'hr': {
                'one': row['HR@1'],
                'three': row['HR@3'],
                'five': row['HR@5'],
                'ten': row['HR@10'],
                'twenty': row['HR@20'],
            },
            'recall': {
                'one': row['Recall@1'],
                'three': row['Recall@3'],
                'five': row['Recall@5'],
                'ten': row['Recall@10'],
                'twenty': row['Recall@20'],
            }
        })

        if (counter >= numof_results_to_send_per_request) or (index == len(grouped_df.index) - 1):
            # Send the results to the backend
            print('Making the HTTP call...')
            response = requests.post(url, headers=headers, json=body, verify=False)
            print('Response:')
            print(response.json())
            print(f'Number of Sent Results: {counter}. Next starting index: {index + 1}')

            # Reset for next batch
            counter = 0
            body = {
                'results': []
            }
            print()
    
    print('Performance Results are added!')

def updatePca():
    # Fetch performance results
    url = 'https://finally.recommender-systems.com/index.php?action=admin&task=getResults'
    headers = {
        'Content-Type': 'application/json',
        ADMIN_HEADER: ADMIN_SECRET_KEY
    }

    response = requests.get(url, headers=headers, verify=False)
    performanceResults = response.json()

    # Calculate PCA (no filter)
    flattened_data = []
    for item in performanceResults['data']:
        flattened_item = {
            'Id': item['Id'],
            'AlgorithmConfigIndex': item['AlgorithmConfigIndex'],
            'AlgorithmConfiguration': item['AlgorithmConfiguration'],
            'AlgorithmId': item['AlgorithmId'],
            'DatasetId': item['DatasetId'],
            'CreatedDate': item['CreatedDate'],
            **{f'Ndcg_{k}': v for k, v in item['Ndcg'].items()},
            **{f'Hr_{k}': v for k, v in item['Hr'].items()},
            **{f'Recall_{k}': v for k, v in item['Recall'].items()}
        }
        flattened_data.append(flattened_item)

    data_df = pd.DataFrame(flattened_data)

    dataset_ids = data_df['DatasetId'].unique().tolist()
    scores = ['ndcg', 'hr', 'recall']
    kValues = ['one', 'three', 'five', 'ten', 'twenty']
    pca_results = []

    for dataset_id in dataset_ids:
        element = {'datasetId': dataset_id}
        for score in scores:
            element[score] = {}
            for kValue in kValues:
                element[score][kValue] = {
                    'x': None,
                    'y': None,
                    'varianceX': None,
                    'varianceY': None
                }
        pca_results.append(element)

    for score in scores:
        for kValue in kValues:
            metric = score.capitalize() + '_' + kValue.capitalize()

            metric_df = data_df[['DatasetId', 'AlgorithmId', metric]].copy()

            algorithms = metric_df['AlgorithmId'].unique().tolist()
            datasets = metric_df['DatasetId'].unique().tolist()

            pivot_df = metric_df.pivot_table(index='DatasetId', columns='AlgorithmId', values=metric)
            X = pivot_df.to_numpy()
            dataset_index = pivot_df.index.tolist()

            imp = SimpleImputer(missing_values=np.nan, strategy="mean")
            X_imputed = imp.fit_transform(X)

            pca = PCA(n_components=2)
            X_pca = pca.fit_transform(X_imputed)

            pca_coords = dict(zip(dataset_index, X_pca))

            dataset_points = defaultdict(list)

            for _, row in metric_df.iterrows():
                ds = row['DatasetId']
                alg = row['AlgorithmId']

                row_vector = [np.nan] * len(algorithms)
                alg_idx = algorithms.index(alg)
                row_vector[alg_idx] = row[metric]

                filled_row = imp.transform([row_vector])[0]

                pca_point = pca.transform([filled_row])[0]

                dataset_points[ds].append(pca_point)

            for result in pca_results:
                ds = result['datasetId']
                if ds in pca_coords:
                    result[score][kValue]['x'] = pca_coords[ds][0]
                    result[score][kValue]['y'] = pca_coords[ds][1]

                    points = dataset_points.get(ds, [])
                    if len(points) > 1:
                        points = np.array(points)
                        result[score][kValue]['varianceX'] = np.std(points[:, 0])
                        result[score][kValue]['varianceY'] = np.std(points[:, 1])
                    else:
                        result[score][kValue]['varianceX'] = 0
                        result[score][kValue]['varianceY'] = 0

    # Update PCA
    url = 'https://finally.recommender-systems.com/index.php?action=admin&task=updatePca'
    headers = {
        'Content-Type': 'application/json',
        ADMIN_HEADER: ADMIN_SECRET_KEY
    }

    body = {
        'results': pca_results
    }

    response = requests.post(url, headers=headers, json=body, verify=False)
    print(response.json())
    print('PCA results are updated!')

if __name__ == '__main__':
    # Uncomment the code based-on your need

    #addPerformanceResults()
    updatePca()

    print('Operation is completed')
