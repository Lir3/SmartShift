from django.http import HttpResponse

def index(request):
    return HttpResponse('Hello Django!!')


import seaborn as sns
df = sns.load_dataset("titanic")
#ageの欠損値の補完（中央値）
from sklearn.impute import SimpleImputer
#SimpleImputerクラスのインスタンスを生成する
median_imputer = SimpleImputer(strategy='median')
#データをコピーし、補完した行を作成する
df2 = df.copy()
df[['age']] = median_imputer.fit_transform(df2[['age']])
#結果を確認する
df2[df.age.isna()].head()
#embarkedの欠損値の補完（最頻値）
#SimpleImputerクラスのインスタンスを生成する
most_frequent_imputer = SimpleImputer(strategy='most_frequent')
#データをコピーし、補完した行を作成する
df3 = df2.copy()
df3.loc[:,'embarked'] = most_frequent_imputer.fit_transform(df2[['embarked']])
#結果を確認する
df3[df2['embarked'].isna()]
df4 = df3.drop('deck',axis=1)
df4.head()
#ラベルエンコーディング
from sklearn.preprocessing import LabelEncoder
#LabelEncoderクラスのインスタンスを生成する
enc = LabelEncoder()
#ラベルエンコーディングを行う
label_encoder = enc.fit(df4[['sex']].values.ravel())
label_encoder.classes_
#female → 0,male → 1
df4['sex'] = label_encoder.transform(df4[['sex']].values.ravel())
df4.head()