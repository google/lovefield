/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var loadingEmptyDbView = {
  name: 'Loading_Empty_DB',
  graphs: [
    {
      name: 'Initialize empty db',
      curves: [
        'Init empty DB'
      ]
    }
  ]
};


var loadingPopulatedDbView = {
  name: 'Loading_Populated_DB',
  graphs: [
    {
      name: 'Initialize populated db',
      curves: [
        'Init populated DB'
      ]
    }
  ]
};


fullTableScudGraphs = [
  {
    name: 'Full table scan: Select',
    curves: [
      'Select 10000',
      'Select 20000',
      'Select 30000',
      'Select 40000',
      'Select 50000'
    ]
  },
  {
    name: 'Full table scan: Insert',
    curves: [
      'Insert 10000',
      'Insert 20000',
      'Insert 30000',
      'Insert 40000',
      'Insert 50000'
    ]
  },
  {
    name: 'Full table scan: Update',
    curves: [
      'Update 10000',
      'Update 20000',
      'Update 30000',
      'Update 40000',
      'Update 50000'
    ]
  },
  {
    name: 'Full table scan: Delete',
    curves: [
      'Delete 10000',
      'Delete 20000',
      'Delete 30000',
      'Delete 40000',
      'Delete 50000'
    ]
  }
];


var fullTableScudView = {
  name: 'Full_table_SCUD',
  graphs: fullTableScudGraphs
};


var fullTableScudMemView = {
  name: 'Full_table_SCUD_Mem',
  graphs: fullTableScudGraphs
};


var pkBasedScudGraphs = [
  {
    name: 'PK-based table scan: Select',
    curves: [
      'Select 1',
      'Select 10',
      'Select 100',
      'Select 1000',
      'Select 10000'
    ]
  },
  {
    name: 'PK-based table scan: Insert',
    curves: [
      'Insert 1',
      'Insert 10',
      'Insert 100',
      'Insert 1000',
      'Insert 10000'
    ]
  },
  {
    name: 'PK-based table scan: Update',
    curves: [
      'Update 1',
      'Update 10',
      'Update 100',
      'Update 1000',
      'Update 10000'
    ]
  },
  {
    name: 'PK-based table scan: Delete',
    curves: [
      'Delete 1',
      'Delete 10',
      'Delete 100',
      'Delete 1000',
      'Delete 10000'
    ]
  }
];


var pkBasedScudView = {
  name: 'PK-based_SCUD',
  graphs: pkBasedScudGraphs
};


var pkBasedScudMemView = {
  name: 'PK-based_SCUD_Mem',
  graphs: pkBasedScudGraphs
};


var selectBenchmarkGraphs = [
  {
    name: 'Select single with predicates',
    curves: [
      'SingleRowIndexed',
      'SingleRowNonIndexed',
      'SingleRowMultipleIndices'
    ]
  },
  {
    name: 'Select many with predicates',
    curves: [
      'MultiRowIndexedRange',
      'MultiRowIndexedSpacedOut',
      'MultiRowNonIndexedRange',
      'MultiRowNonIndexedSpacedOut',
      'IndexedOrPredicate',
      'IndexedOrPredicateMultiColumn',
      'IndexedInPredicate'
    ]
  },
  {
    name: 'Select all with projections',
    curves: [
      'ProjectNonAggregatedColumns',
      'ProjectAggregateIndexed',
      'ProjectAggregateNonIndexed'
    ]
  },
  {
    name: 'Select all with ordering',
    curves: [
      'OrderByIndexed',
      'OrderByNonIndexed',
      'OrderByIndexedCrossColumn',
      'LimitSkipIndexed'
    ]
  },
  {
    name: 'Select all with join operations',
    curves: [
      'JoinEqui',
      'JoinTheta'
    ]
  },
  {
    name: 'Select with aggregate functions',
    curves: [
      'CountStar'
    ]
  }
];


var selectBenchmarkView = {
  name: 'SelectBenchmark',
  graphs: selectBenchmarkGraphs
};


var selectBenchmarkMemView = {
  name: 'SelectBenchmark_Mem',
  graphs: selectBenchmarkGraphs
};


var scenarioSimulationsView = {
  name: 'Scenario_Simulations',
  graphs: [
    {
      name: 'Insert via tx attach',
      curves: [
        'Insert via Tx Attach'
      ]
    },
    {
      name: 'Select',
      curves: [
        'Select'
      ]
    },
    {
      name: 'Select binding',
      curves: [
        'Select Binding'
      ]
    }
  ]
};


var foreignKeysBenchmarkView = {
  name: 'ForeignKeysBenchmark',
  graphs: [
    {
      name: 'No foreign key constraints',
      curves: [
        'InsertParent_60000_nofk',
        'InsertChild_60000_nofk',
        'UpdateParent_60000_nofk',
        'UpdateChild_60000_nofk',
        'DeleteParent_50000_nofk',
        'DeleteChild_60000_nofk'
      ]
    },
    {
      name: 'Immediate foreign key constraints',
      curves: [
        'InsertParent_60000_immediate',
        'InsertChild_60000_immediate',
        'UpdateParent_60000_immediate',
        'UpdateChild_60000_immediate',
        'DeleteParent_50000_immediate',
        'DeleteChild_60000_immediate'
      ]
    },
    {
      name: 'Deferrable foreign key constraints',
      curves: [
        'InsertParent_60000_deferrable',
        'InsertChild_60000_deferrable',
        'UpdateParent_60000_deferrable',
        'UpdateChild_60000_deferrable',
        'DeleteParent_50000_deferrable',
        'DeleteChild_60000_deferrable'
      ]
    }
  ]
};


function buildViewMap() {
  var viewMap = new Map();
  var views = [
    fullTableScudMemView,
    fullTableScudView,
    loadingEmptyDbView,
    loadingPopulatedDbView,
    pkBasedScudMemView,
    pkBasedScudView,
    scenarioSimulationsView,
    selectBenchmarkMemView,
    selectBenchmarkView,
    foreignKeysBenchmarkView
  ];

  views.forEach(function(view) {
    viewMap.set(view.name, view);
  });

  return viewMap;
}
